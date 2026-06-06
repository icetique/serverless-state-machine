/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
    pgm.createTable('outbox_events', {
        id: {
            type: 'bigserial',
            primaryKey: true,
        },
        aggregate_type: {
            type: 'text',
            notNull: true,
        },
        aggregate_id: {
            type: 'text',
            notNull: true,
        },
        event_type: {
            type: 'text',
            notNull: true,
        },
        event_source: {
            type: 'text',
            notNull: true,
        },
        payload: {
            type: 'jsonb',
            notNull: true,
        },
        request_id: {
            type: 'text',
        },
        idempotency_key: {
            type: 'text',
        },
        status: {
            type: 'text',
            notNull: true,
            default: 'pending',
        },
        attempt_count: {
            type: 'integer',
            notNull: true,
            default: 0,
        },
        available_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        last_error: {
            type: 'text',
        },
        published_at: {
            type: 'timestamp',
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.createIndex('outbox_events', ['status', 'available_at']);
    pgm.createIndex('outbox_events', ['aggregate_type', 'aggregate_id']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
    pgm.dropTable('outbox_events');
};
