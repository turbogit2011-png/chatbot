<?php
declare(strict_types=1);

namespace TurboGit\Forge\Changeset;

/**
 * Zestaw zmian: lista operacji before/after + pominięte + status. Wersjonowany przez id.
 * Można wyeksportować do JSON (EXPORT CHANGESET) i zaimportować do zatwierdzenia/rollbacku.
 */
final class Changeset
{
    private string $id;
    private string $status = ChangesetEngine::PREVIEW;
    /** @var array<int,array{product_id:int,before:array<string,mixed>,after:array<string,mixed>}> */
    private array $changes = [];
    /** @var array<int,array{product_id:int,reason:string}> */
    private array $skipped = [];

    public function __construct(private string $module)
    {
        // id deterministyczne po czasie serwera; unikalne dla wersjonowania i audit logu.
        $this->id = 'cs_' . gmdate('Ymd_His') . '_' . substr(md5($module . uniqid('', true)), 0, 8);
    }

    public function id(): string { return $this->id; }
    public function module(): string { return $this->module; }
    public function status(): string { return $this->status; }
    public function setStatus(string $s): void { $this->status = $s; }

    /** @param array<string,mixed> $before @param array<string,mixed> $after */
    public function addChange(int $productId, array $before, array $after): void
    {
        $this->changes[] = ['product_id' => $productId, 'before' => $before, 'after' => $after];
    }

    public function addSkipped(int $productId, string $reason): void
    {
        $this->skipped[] = ['product_id' => $productId, 'reason' => $reason];
    }

    /** @return array<int,array{product_id:int,before:array<string,mixed>,after:array<string,mixed>}> */
    public function changes(): array { return $this->changes; }
    public function countChanges(): int { return count($this->changes); }
    public function countSkipped(): int { return count($this->skipped); }

    /** @return array<string,mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id, 'module' => $this->module, 'status' => $this->status,
            'changes' => $this->changes, 'skipped' => $this->skipped,
        ];
    }

    public function toJson(): string
    {
        return (string) wp_json_encode($this->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
}
