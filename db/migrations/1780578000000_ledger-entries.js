/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
    pgm.createTable('ledger_entries', {
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
        transaction_id: {
            type: 'text',
            notNull: true,
            unique: true,
        },
        amount: {
            type: 'numeric',
            notNull: true,
        },
        entry_type: {
            type: 'text',
            notNull: true,
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.createIndex('ledger_entries', ['agreement_id', 'created_at']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
    pgm.dropTable('ledger_entries');
};
