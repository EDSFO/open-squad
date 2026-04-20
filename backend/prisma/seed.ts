import { PrismaClient, Plan } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@opensquad.com' },
    update: {},
    create: {
      email: 'admin@opensquad.com',
      passwordHash,
      name: 'Admin',
      locale: 'pt-BR',
      plan: Plan.ENTERPRISE,
      squadLimit: 999,
      isActive: true,
    },
  });
  console.log('Created admin user:', admin.email);

  // Sample squads data
  const squads = [
    {
      slug: 'instagram-carousel',
      localizations: [
        {
          locale: 'pt-BR',
          name: 'Carrossel Instagram',
          description: 'Crie carrosséis envolventes para Instagram com múltiplos slides otimizados para engajamento. Perfeito para marcas que querem storytelling visual.',
          price: 4900,
        },
        {
          locale: 'en-US',
          name: 'Instagram Carousel',
          description: 'Create engaging Instagram carousels with multiple slides optimized for engagement. Perfect for brands wanting visual storytelling.',
          price: 4900,
        },
      ],
    },
    {
      slug: 'linkedin-posts',
      localizations: [
        {
          locale: 'pt-BR',
          name: 'Posts LinkedIn',
          description: 'Gere posts profissionais para LinkedIn que geram conversas e conexões. Aprenda a escrever títulos que convertem e calls-to-action eficazes.',
          price: 3900,
        },
        {
          locale: 'en-US',
          name: 'LinkedIn Posts',
          description: 'Generate professional LinkedIn posts that spark conversations and connections. Learn to write headlines that convert and effective calls-to-action.',
          price: 3900,
        },
      ],
    },
    {
      slug: 'tutorial-generator',
      localizations: [
        {
          locale: 'pt-BR',
          name: 'Gerador de Tutoriais',
          description: 'Crie tutoriais passo a passo detalhados para qualquer processo ou produto. Ideal para documentações, blogs e vídeos instrucionais.',
          price: 5900,
        },
        {
          locale: 'en-US',
          name: 'Tutorial Generator',
          description: 'Create detailed step-by-step tutorials for any process or product. Ideal for documentation, blogs, and instructional videos.',
          price: 5900,
        },
      ],
    },
    {
      slug: 'recruiting-screening',
      localizations: [
        {
          locale: 'pt-BR',
          name: 'Recrutamento e Seleção',
          description: 'Analise curriculos, compare candidatos com a vaga, gere score de aderencia, perguntas de entrevista e parecer final para triagem inicial.',
          price: 6900,
        },
        {
          locale: 'en-US',
          name: 'Recruiting Screening',
          description: 'Analyze resumes, compare candidates against the role, generate fit score, interview questions, and a final screening recommendation.',
          price: 6900,
        },
      ],
    },
  ];

  // Create squads with localizations
  for (const squadData of squads) {
    const squad = await prisma.squad.upsert({
      where: { slug: squadData.slug },
      update: {
        creatorUserId: admin.id,
      },
      create: {
        slug: squadData.slug,
        isPublished: true,
        creatorUserId: admin.id,
        localizations: {
          create: squadData.localizations,
        },
      },
    });
    console.log('Created squad:', squad.slug);
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
