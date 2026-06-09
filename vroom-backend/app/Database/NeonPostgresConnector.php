<?php

namespace App\Database;

use Illuminate\Database\Connectors\PostgresConnector;

/**
 * Connecteur PostgreSQL étendu pour Neon.tech.
 * Ajoute l'endpoint ID dans le DSN — nécessaire quand libpq ne supporte pas SNI.
 */
class NeonPostgresConnector extends PostgresConnector
{
    protected function getDsn(array $config): string
    {
        $dsn = parent::getDsn($config);

        if (!empty($config['endpoint'])) {
            $dsn .= ";options=endpoint={$config['endpoint']}";
        }

        return $dsn;
    }
}
