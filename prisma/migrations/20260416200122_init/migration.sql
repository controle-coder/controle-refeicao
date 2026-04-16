-- CreateTable
CREATE TABLE "Restaurante" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Fazenda" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "fazendaId" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Turma_fazendaId_fkey" FOREIGN KEY ("fazendaId") REFERENCES "Fazenda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Requisitante" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'REQUISITANTE',
    "fazendaId" INTEGER NOT NULL,
    "turmaId" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Requisitante_fazendaId_fkey" FOREIGN KEY ("fazendaId") REFERENCES "Fazenda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Requisitante_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "restauranteId" INTEGER NOT NULL,
    "fazendaId" INTEGER NOT NULL,
    "turmaId" INTEGER NOT NULL,
    "requisitanteId" INTEGER NOT NULL,
    "versaoAtual" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Pedido_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "Restaurante" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_fazendaId_fkey" FOREIGN KEY ("fazendaId") REFERENCES "Fazenda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_requisitanteId_fkey" FOREIGN KEY ("requisitanteId") REFERENCES "Requisitante" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VersaoPedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "observacao" TEXT,
    "criadoPorId" INTEGER NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VersaoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VersaoPedido_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Requisitante" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemRefeicao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "versaoPedidoId" INTEGER NOT NULL,
    "tipoRefeicao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    CONSTRAINT "ItemRefeicao_versaoPedidoId_fkey" FOREIGN KEY ("versaoPedidoId") REFERENCES "VersaoPedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Requisitante_login_key" ON "Requisitante"("login");

-- CreateIndex
CREATE UNIQUE INDEX "VersaoPedido_pedidoId_numero_key" ON "VersaoPedido"("pedidoId", "numero");
