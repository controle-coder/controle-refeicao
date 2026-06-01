-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "contratoId" INTEGER;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;
