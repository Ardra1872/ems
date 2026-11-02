<?php
if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit;
}

require_once __DIR__ . "/../config/database.php";

try {
    $conn->query(
        "CREATE TABLE IF NOT EXISTS audit_logs (
            id BIGINT NOT NULL AUTO_INCREMENT,
            actor_user_id INT NOT NULL,
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INT NOT NULL,
            details LONGTEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_audit_entity (entity_type, entity_id),
            KEY idx_audit_actor_time (actor_user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
    );
    echo "Audit log table is ready.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Audit log migration failed: " . $error->getMessage() . "\n");
    exit(1);
}
?>
