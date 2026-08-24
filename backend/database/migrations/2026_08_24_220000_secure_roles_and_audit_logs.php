<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'role')) {
            DB::statement("ALTER TABLE users MODIFY role VARCHAR(32) NOT NULL DEFAULT 'user'");
        }

        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->string('user_email', 255)->nullable();
                $table->string('action', 64);
                $table->string('entity', 32)->nullable();
                $table->string('entity_id', 64)->nullable();
                $table->string('ip', 45)->nullable();
                $table->string('user_agent', 255)->nullable();
                $table->json('meta')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->index('created_at');
                $table->index('action');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'role')) {
            DB::statement("ALTER TABLE users MODIFY role VARCHAR(32) NOT NULL DEFAULT 'admin'");
        }
    }
};
