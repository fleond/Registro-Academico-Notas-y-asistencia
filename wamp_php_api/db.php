<?php
/**
 * Conexión Segura PDO a MySQL para WAMP Server
 */

require_once __DIR__ . '/config.php';

function getDBConnection() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "message" => "Error conectando a la base de datos MySQL en WAMP: " . $e->getMessage(),
                "hint" => "Verifica que el servicio MySQL de WAMP esté iniciado (ícono verde) y que la base de datos '" . DB_NAME . "' haya sido creada en phpMyAdmin."
            ]);
            exit();
        }
    }
    return $pdo;
}
