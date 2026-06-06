/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
    pgm.createTable('agreement_events', {
        id: {
            type: 'bigserial',
            primaryKey: true,
        },
        agreement_id: {
            type: 'bigint',
            notNull: true,
            references: 'agreements',
            onDelete: 'CASCADE',
        },
        event_type: {
            type: 'text',
            notNull: true,
        },
        previous_status: {
            type: 'text',
        },
        new_status: {
            type: 'text',
            notNull: true,
        },
        actor_id: {
            type: 'text',
            notNull: true,
        },
        actor_type: {
            type: 'text',
            notNull: true,
        },
        request_id: {
            type: 'text',
            notNull: true,
        },
        idempotency_key: {
            type: 'text',
            notNull: true,
        },
        payload: {
            type: 'jsonb',
            notNull: true,
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.createIndex('agreement_events', ['agreement_id', 'created_at']);
    pgm.createIndex('agreement_events', ['idempotency_key']);

    pgm.createTable('idempotency_keys', {
        id: {
            type: 'bigserial',
            primaryKey: true,
        },
        idempotency_key: {
            type: 'text',
            notNull: true,
            unique: true,
        },
        operation_type: {
            type: 'text',
            notNull: true,
        },
        request_hash: {
            type: 'text',
            notNull: true,
        },
        response_status_code: {
            type: 'integer',
            notNull: true,
        },
        response_body: {
            type: 'text',
            notNull: true,
        },
        agreement_id: {
            type: 'bigint',
            references: 'agreements',
            onDelete: 'SET NULL',
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
    pgm.dropTable('idempotency_keys');
    pgm.dropTable('agreement_events');
};
