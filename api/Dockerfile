# --- Build stage -------------------------------------------------------
FROM rust:1-alpine AS builder
WORKDIR /app

RUN apk add --no-cache build-base pkgconfig sqlite-dev sqlite

# Cache dependency compilation separately from application code: build a
# throwaway binary against just the manifests first, so `cargo build` only
# recompiles our own sources when they change.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src \
    && echo "fn main() {}" > src/main.rs \
    && cargo build --release --locked \
    && rm -rf src

COPY migrations ./migrations
COPY src ./src

# sqlx's `query!` macro type-checks queries against a real database at
# compile time, so apply the migrations to a throwaway DB just for the build.
RUN cat migrations/*.sql | sqlite3 build.db
ENV DATABASE_URL=sqlite:./build.db

# Touch main.rs so its mtime is newer than the cached dummy build's output,
# forcing cargo to actually relink against the real sources.
RUN touch src/main.rs && cargo build --release --locked && rm -f build.db

# --- Runtime stage -------------------------------------------------------
FROM alpine:3 AS runtime
WORKDIR /app

RUN apk add --no-cache sqlite-libs curl \
    && addgroup -S appuser && adduser -S appuser -G appuser \
    && mkdir -p /data && chown appuser:appuser /data

COPY --from=builder /app/target/release/clockwork-api /usr/local/bin/clockwork-api

USER appuser

ENV DATABASE_URL=sqlite:/data/clockwork.db?mode=rwc
VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["clockwork-api"]
