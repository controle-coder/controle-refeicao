import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

const dbPath = process.env.DATABASE_URL?.replace('file:', '') ?? path.resolve(process.cwd(), 'dev.db')
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
})

async function main() {
  console.log('Iniciando seed...')

  // Restaurantes
  const r1 = await prisma.restaurante.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: 'Restaurante Central',
      telefone: '5565999990001',
    },
  })

  await prisma.restaurante.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nome: 'Cantina do Zé',
      telefone: '5565999990002',
    },
  })

  // Fazendas
  const f1 = await prisma.fazenda.upsert({
    where: { id: 1 },
    update: {},
    create: { nome: 'Fazenda São João' },
  })

  await prisma.fazenda.upsert({
    where: { id: 2 },
    update: {},
    create: { nome: 'Fazenda Boa Vista' },
  })

  // Turmas
  const t1 = await prisma.turma.upsert({
    where: { id: 1 },
    update: {},
    create: { nome: 'Turma A', fazendaId: f1.id },
  })

  await prisma.turma.upsert({
    where: { id: 2 },
    update: {},
    create: { nome: 'Turma B', fazendaId: f1.id },
  })

  // Admin
  const adminPin = await bcrypt.hash('1234', 10)
  await prisma.requisitante.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      nome: 'Administrador',
      login: 'admin',
      pinHash: adminPin,
      role: 'ADMIN',
      fazendaId: f1.id,
      turmaId: t1.id,
    },
  })

  // Requisitante de exemplo
  const reqPin = await bcrypt.hash('4321', 10)
  await prisma.requisitante.upsert({
    where: { login: 'carlos' },
    update: {},
    create: {
      nome: 'Carlos Silva',
      login: 'carlos',
      pinHash: reqPin,
      role: 'REQUISITANTE',
      fazendaId: f1.id,
      turmaId: t1.id,
    },
  })

  console.log('Seed concluído!')
  console.log('  Admin:        login=admin  | PIN=1234')
  console.log('  Requisitante: login=carlos | PIN=4321')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
