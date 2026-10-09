<?php

declare(strict_types=1);

namespace Combust\Support;

final class Clock
{
    public static function nowMs(): int
    {
        return (int) floor(microtime(true) * 1000);
    }
}
