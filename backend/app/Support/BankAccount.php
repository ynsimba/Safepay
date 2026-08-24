<?php

namespace App\Support;

/** Masquage des IBAN / RIB avant envoi au client. */
final class BankAccount
{
    public static function mask(?string $value): string
    {
        $compact = preg_replace('/\s+/', '', (string) $value) ?? '';
        if ($compact === '') {
            return '';
        }
        $length = mb_strlen($compact);
        if ($length <= 4) {
            return str_repeat('•', $length);
        }

        return str_repeat('•', $length - 4).mb_substr($compact, -4);
    }
}
