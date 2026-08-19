<?php

declare(strict_types=1);

namespace Combust;

use Combust\Support\Response;

/**
 * Minimal method+path router. Routes are matched in registration order,
 * so register more specific paths (e.g. "/entries/bulk") before
 * parameterized ones that could also match them (e.g. "/entries/{id}").
 */
final class Router
{
    /** @var list<array{method: string, pattern: string, handler: array{0: class-string, 1: string}}> */
    private array $routes = [];

    public function get(string $pattern, array $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, array $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function put(string $pattern, array $handler): void
    {
        $this->add('PUT', $pattern, $handler);
    }

    public function delete(string $pattern, array $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    private function add(string $method, string $pattern, array $handler): void
    {
        $this->routes[] = ['method' => $method, 'pattern' => $pattern, 'handler' => $handler];
    }

    public function dispatch(string $method, string $path): void
    {
        $path = rtrim($path, '/');
        if ($path === '') {
            $path = '/';
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = $this->match($route['pattern'], $path);
            if ($params === null) {
                continue;
            }

            [$class, $action] = $route['handler'];
            (new $class())->$action($params);
            return;
        }

        Response::error('Not found', 404);
    }

    /** @return array<string, string>|null */
    private function match(string $pattern, string $path): ?array
    {
        $regex = preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $pattern);

        if (!preg_match('#^' . $regex . '$#', $path, $matches)) {
            return null;
        }

        return array_filter($matches, fn($key) => is_string($key), ARRAY_FILTER_USE_KEY);
    }
}
