CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    type            VARCHAR(50) NOT NULL,
    title_en        VARCHAR(255) NOT NULL,
    title_so        VARCHAR(255) NOT NULL,
    body_en         TEXT NOT NULL,
    body_so         TEXT NOT NULL,
    data            JSONB,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMPTZ,
    fcm_message_id  VARCHAR(255),

    CONSTRAINT chk_type
        CHECK (type IN (
            'transaction_received',
            'transaction_sent',
            'spending_alert',
            'daily_summary',
            'weekly_summary',
            'monthly_summary',
            'report_ready',
            'trial_ending',
            'account'
        )),

    CONSTRAINT chk_read_at
        CHECK (
            (is_read = FALSE AND read_at IS NULL) OR
            (is_read = TRUE AND read_at IS NOT NULL)
        )
);

CREATE INDEX idx_notifications_user_id
    ON notifications(user_id, sent_at DESC);

CREATE INDEX idx_notifications_user_unread
    ON notifications(user_id, sent_at DESC)
    WHERE is_read = FALSE;

CREATE INDEX idx_notifications_fcm_message_id
    ON notifications(fcm_message_id)
    WHERE fcm_message_id IS NOT NULL;