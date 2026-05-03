import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });
const YEAR = '2024-2025';
const h = (pw: string) => bcrypt.hash(pw, 12);

async function main() {
  console.log('🌱  Seeding full demo data...\n');

  // ── CLEANUP (make fully idempotent) ───────────────────────────────────────
  console.log('🧹  Clearing old transactional data...');
  await prisma.message.deleteMany({});
  await prisma.messageRead.deleteMany({});
  await prisma.binomeInvitation.deleteMany({});
  await prisma.studentApplication.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.internshipStudent.deleteMany({});
  await prisma.internship.deleteMany({});
  await prisma.topic.deleteMany({});
  await prisma.systemDeadline.deleteMany({});
  console.log('✅  Clean slate\n');


  // ── SETTINGS ─────────────────────────────────────────────────────────────
  await prisma.systemSettings.upsert({ where: { key: 'current_academic_year' }, update: { value: YEAR }, create: { id: randomUUID(), key: 'current_academic_year', value: YEAR, updatedAt: new Date() } });
  // Also upsert the camelCase key that SettingsService.getCurrentAcademicYear() reads
  await prisma.systemSettings.upsert({ where: { key: 'currentAcademicYear' }, update: { value: YEAR }, create: { id: randomUUID(), key: 'currentAcademicYear', value: YEAR, updatedAt: new Date() } });

  await prisma.systemSettings.upsert({ where: { key: 'available_specialities' }, update: {}, create: { id: randomUUID(), key: 'available_specialities', updatedAt: new Date(), value: JSON.stringify(['Génie Logiciel', 'Cybersécurité', 'Intelligence Artificielle', 'Réseaux']) } });
  await prisma.systemSettings.upsert({ where: { key: 'available_promotions' }, update: {}, create: { id: randomUUID(), key: 'available_promotions', updatedAt: new Date(), value: JSON.stringify(['L1 Info', 'L2 Info', 'L3 Info', 'M1 GL', 'M2 GL', 'M1 Cyber', 'M2 Cyber']) } });

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  await prisma.user.upsert({ where: { email: 'admin@esst.dz' }, update: {}, create: { id: randomUUID(), name: 'Administrateur ESST', email: 'admin@esst.dz', password: await h('Admin1234!'), role: 'ADMIN', isActive: true, mustChangePassword: false, updatedAt: new Date(), adminProfile: { create: { id: randomUUID(), isSuperAdmin: true } } } });

  // ── TEACHERS ──────────────────────────────────────────────────────────────
  const tPw = await h('Teacher123!');
  const kadri = await prisma.user.upsert({ where: { email: 'kadri@esst.dz' }, update: {}, create: { id: randomUUID(), name: 'Dr. Kadri Mohammed', email: 'kadri@esst.dz', password: tPw, role: 'TEACHER', isActive: true, mustChangePassword: false, updatedAt: new Date(), teacherProfile: { create: { id: randomUUID(), speciality: 'Génie Logiciel', grade: 'MCB', maxStudents: 6, currentLoad: 0 } } } });
  const beloufa = await prisma.user.upsert({ where: { email: 'beloufa@esst.dz' }, update: {}, create: { id: randomUUID(), name: 'Dr. Beloufa Samira', email: 'beloufa@esst.dz', password: tPw, role: 'TEACHER', isActive: true, mustChangePassword: false, updatedAt: new Date(), teacherProfile: { create: { id: randomUUID(), speciality: 'Cybersécurité', grade: 'MCA', maxStudents: 4, currentLoad: 0 } } } });
  const merabet = await prisma.user.upsert({ where: { email: 'merabet@esst.dz' }, update: {}, create: { id: randomUUID(), name: 'Dr. Merabet Anis', email: 'merabet@esst.dz', password: tPw, role: 'TEACHER', isActive: true, mustChangePassword: false, updatedAt: new Date(), teacherProfile: { create: { id: randomUUID(), speciality: 'Intelligence Artificielle', grade: 'MCA', maxStudents: 5, currentLoad: 0 } } } });

  // ── COMPANIES ─────────────────────────────────────────────────────────────
  const cPw = await h('Company123!');
  const sonatrach = await prisma.user.upsert({ where: { email: 'sonatrach@demo.dz' }, update: {}, create: { id: randomUUID(), name: 'Sonatrach DSI', email: 'sonatrach@demo.dz', password: cPw, role: 'COMPANY', isActive: true, mustChangePassword: false, updatedAt: new Date(), companyProfile: { create: { id: randomUUID(), companyName: 'Sonatrach', sector: 'Énergie & Pétrole', wilaya: 'Alger' } } } });
  const djezzy = await prisma.user.upsert({ where: { email: 'djezzy@demo.dz' }, update: {}, create: { id: randomUUID(), name: 'Djezzy Tech', email: 'djezzy@demo.dz', password: cPw, role: 'COMPANY', isActive: true, mustChangePassword: false, updatedAt: new Date(), companyProfile: { create: { id: randomUUID(), companyName: 'Djezzy', sector: 'Télécommunications', wilaya: 'Alger' } } } });
  const cevital = await prisma.user.upsert({ where: { email: 'cevital@demo.dz' }, update: {}, create: { id: randomUUID(), name: 'Cevital IT', email: 'cevital@demo.dz', password: cPw, role: 'COMPANY', isActive: true, mustChangePassword: false, updatedAt: new Date(), companyProfile: { create: { id: randomUUID(), companyName: 'Cevital', sector: 'Agroalimentaire & Tech', wilaya: 'Béjaïa' } } } });

  // ── STUDENTS ──────────────────────────────────────────────────────────────
  const sPw = await h('Student123!');
  // M2 students (PFE eligible) - BINÔME team
  const amira = await prisma.user.upsert({ where: { email: 'amira@student.dz' }, update: {}, create: { id: randomUUID(), name: 'Amira Boudiaf', email: 'amira@student.dz', password: sPw, role: 'STUDENT', level: 'M2', isActive: true, mustChangePassword: false, updatedAt: new Date(), studentProfile: { create: { id: randomUUID(), studentId: '22210001', promotion: 'M2 GL', speciality: 'Génie Logiciel', academicYear: YEAR, level: 'M2' } } } });
  const khalil = await prisma.user.upsert({ where: { email: 'khalil@student.dz' }, update: {}, create: { id: randomUUID(), name: 'Khalil Mesbahi', email: 'khalil@student.dz', password: sPw, role: 'STUDENT', level: 'M2', isActive: true, mustChangePassword: false, updatedAt: new Date(), studentProfile: { create: { id: randomUUID(), studentId: '22210005', promotion: 'M2 GL', speciality: 'Génie Logiciel', academicYear: YEAR, level: 'M2' } } } });
  // L3 student (PFE eligible) - SOLO
  const yacine = await prisma.user.upsert({ where: { email: 'yacine@student.dz' }, update: {}, create: { id: randomUUID(), name: 'Yacine Hamidi', email: 'yacine@student.dz', password: sPw, role: 'STUDENT', level: 'L3', isActive: true, mustChangePassword: false, updatedAt: new Date(), studentProfile: { create: { id: randomUUID(), studentId: '22210002', promotion: 'L3 Informatique', speciality: 'Informatique', academicYear: YEAR, level: 'L3' } } } });
  // M1 students (NORMAL only)
  const rania = await prisma.user.upsert({ where: { email: 'rania@student.dz' }, update: {}, create: { id: randomUUID(), name: 'Rania Meziane', email: 'rania@student.dz', password: sPw, role: 'STUDENT', level: 'M1', isActive: true, mustChangePassword: false, updatedAt: new Date(), studentProfile: { create: { id: randomUUID(), studentId: '22210003', promotion: 'M1 GL', speciality: 'Génie Logiciel', academicYear: YEAR, level: 'M1' } } } });
  const sofiane = await prisma.user.upsert({ where: { email: 'sofiane@student.dz' }, update: {}, create: { id: randomUUID(), name: 'Sofiane Dali', email: 'sofiane@student.dz', password: sPw, role: 'STUDENT', level: 'M2', isActive: true, mustChangePassword: false, updatedAt: new Date(), studentProfile: { create: { id: randomUUID(), studentId: '22210006', promotion: 'M2 Cyber', speciality: 'Cybersécurité', academicYear: YEAR, level: 'M2' } } } });

  console.log('✅  Users created (1 admin, 3 teachers, 3 companies, 5 students)');

  // ── TOPICS ────────────────────────────────────────────────────────────────
  const t1 = await prisma.topic.upsert({ where: { id: 'topic-001' }, update: {}, create: { id: 'topic-001', title: 'Système de monitoring réseau temps réel avec ML', description: 'Conception d\'une plateforme de surveillance réseau avec alertes intelligentes.', requiredSkills: 'Python, React, Kafka, Docker', type: 'COMPANY_PROPOSED', internshipType: 'PFE', maxStudents: 2, academicYear: YEAR, proposedById: sonatrach.id, assignedTeacherId: kadri.id, status: 'TAKEN', companyName: 'Sonatrach', updatedAt: new Date() } });
  const t2 = await prisma.topic.upsert({ where: { id: 'topic-002' }, update: {}, create: { id: 'topic-002', title: 'Sécurisation infrastructure 5G contre cyberattaques', description: 'Analyse des vulnérabilités 5G et mise en place d\'un IDS adapté.', requiredSkills: 'Cybersécurité, Python, Wireshark, Snort', type: 'COMPANY_PROPOSED', internshipType: 'PFE', maxStudents: 1, academicYear: YEAR, proposedById: djezzy.id, assignedTeacherId: beloufa.id, status: 'TAKEN', companyName: 'Djezzy', updatedAt: new Date() } });
  const t3 = await prisma.topic.upsert({ where: { id: 'topic-003' }, update: {}, create: { id: 'topic-003', title: 'Automatisation rapports RH avec Power BI', description: 'Stage observation: automatisation tableaux de bord RH mensuels.', requiredSkills: 'Power BI, Excel, Python', type: 'COMPANY_PROPOSED', internshipType: 'NORMAL', maxStudents: 1, academicYear: YEAR, proposedById: sonatrach.id, assignedTeacherId: kadri.id, status: 'TAKEN', companyName: 'Sonatrach', updatedAt: new Date() } });
  const t4 = await prisma.topic.upsert({ where: { id: 'topic-004' }, update: {}, create: { id: 'topic-004', title: 'Chatbot IA pour support client e-commerce', description: 'Développement d\'un assistant conversationnel basé sur LLM.', requiredSkills: 'Python, LangChain, FastAPI, React', type: 'COMPANY_PROPOSED', internshipType: 'PFE', maxStudents: 1, academicYear: YEAR, proposedById: cevital.id, assignedTeacherId: merabet.id, status: 'OPEN_FOR_SELECTION', companyName: 'Cevital', updatedAt: new Date() } });
  const t5 = await prisma.topic.upsert({ where: { id: 'topic-005' }, update: {}, create: { id: 'topic-005', title: 'App mobile gestion rendez-vous médicaux', description: 'Stage proposé par l\'étudiant chez une clinique privée.', requiredSkills: 'React Native, Node.js, MongoDB', type: 'STUDENT_PROPOSED', internshipType: 'PFE', maxStudents: 1, academicYear: YEAR, proposedById: sofiane.id, status: 'PENDING_ADMIN', companyName: 'Clinique El Hayat', contactPerson: 'Dr. Mansouri', contactEmail: 'mansouri@elhayat.dz', proposedByStudent: true, directAssigneeId: sofiane.id, updatedAt: new Date() } });

  console.log('✅  5 topics (2 PFE taken, 1 Normal taken, 1 PFE open, 1 student-proposed pending)');

  // ── INTERNSHIPS ───────────────────────────────────────────────────────────
  // 1. PFE BINÔME — Amira + Khalil @ Sonatrach — IN_PROGRESS
  const int1 = await prisma.internship.upsert({ where: { id: 'int-001' }, update: {}, create: { id: 'int-001', topicId: t1.id, teacherId: kadri.id, academicYear: YEAR, internshipType: 'PFE', status: 'IN_PROGRESS', startDate: new Date('2025-02-01'), endDate: new Date('2025-06-30'), midtermDeadline: new Date('2025-04-15'), finalDeadline: new Date('2025-06-15'), activatedAt: new Date('2025-02-01'), technicalSupervisorName: 'M. Bensaid Omar', technicalSupervisorEmail: 'bensaid@sonatrach.dz', updatedAt: new Date(), students: { create: [{ id: randomUUID(), studentId: amira.id, isLeader: true }, { id: randomUUID(), studentId: khalil.id, isLeader: false }] } } });

  // 2. PFE SOLO — Yacine @ Djezzy — DOCUMENT_SENT
  const int2 = await prisma.internship.upsert({ where: { id: 'int-002' }, update: {}, create: { id: 'int-002', topicId: t2.id, teacherId: beloufa.id, academicYear: YEAR, internshipType: 'PFE', status: 'DOCUMENT_SENT', startDate: new Date('2025-02-01'), endDate: new Date('2025-06-30'), midtermDeadline: new Date('2025-04-15'), finalDeadline: new Date('2025-06-15'), technicalSupervisorName: 'Mme. Belkacem', technicalSupervisorEmail: 'belkacem@djezzy.dz', updatedAt: new Date(), students: { create: [{ id: randomUUID(), studentId: yacine.id, isLeader: true }] } } });

  // 3. NORMAL — Rania @ Sonatrach — IN_PROGRESS
  const int3 = await prisma.internship.upsert({ where: { id: 'int-003' }, update: {}, create: { id: 'int-003', topicId: t3.id, teacherId: kadri.id, academicYear: YEAR, internshipType: 'NORMAL', status: 'IN_PROGRESS', startDate: new Date('2025-03-01'), endDate: new Date('2025-05-31'), finalDeadline: new Date('2025-05-20'), activatedAt: new Date('2025-03-01'), updatedAt: new Date(), students: { create: [{ id: randomUUID(), studentId: rania.id, isLeader: true }] } } });

  console.log('✅  3 internships (PFE binôme IN_PROGRESS, PFE solo DOCUMENT_SENT, Normal IN_PROGRESS)');

  // ── APPLICATIONS ──────────────────────────────────────────────────────────
  await prisma.studentApplication.upsert({ where: { id: 'app-001' }, update: {}, create: { id: 'app-001', topicId: t4.id, leaderId: sofiane.id, isBinome: false, status: 'PENDING' } });
  await prisma.studentApplication.upsert({ where: { id: 'app-002' }, update: {}, create: { id: 'app-002', topicId: t1.id, leaderId: amira.id, isBinome: true, status: 'ACCEPTED', reviewedAt: new Date('2025-01-20') } });

  console.log('✅  2 applications (1 pending on open topic, 1 accepted)');

  // ── BINÔME INVITATION ─────────────────────────────────────────────────────
  await prisma.binomeInvitation.upsert({ where: { id: 'binv-001' }, update: {}, create: { id: 'binv-001', application: { connect: { id: 'app-002' } }, invitedStudentId: khalil.id, status: 'ACCEPTED', message: 'Salut Khalil, tu veux faire le PFE ensemble chez Sonatrach ?', respondedAt: new Date('2025-01-18'), expiresAt: new Date('2025-02-01') } });

  console.log('✅  1 binôme invitation (accepted — Amira invited Khalil)');

  // ── MESSAGES ─────────────────────────────────────────────────────────────
  // Thread 1: Amira+Khalil+Kadri+Sonatrach (int-001)
  const msgs1 = [
    { id: 'msg-001', internshipId: 'int-001', senderId: amira.id, content: 'Bonjour à tous ! Khalil et moi avons commencé l\'analyse de l\'existant. On a identifié 3 outils open-source pour le monitoring : Prometheus, Grafana et Zabbix.', sentAt: new Date('2025-02-05T09:00:00'), attachmentName: 'analyse_outils.pdf' },
    { id: 'msg-002', internshipId: 'int-001', senderId: kadri.id, content: 'Bien. Je vous recommande de partir sur Prometheus + Grafana. Préparez un document comparatif pour notre prochaine réunion jeudi.', sentAt: new Date('2025-02-05T14:20:00') },
    { id: 'msg-003', internshipId: 'int-001', senderId: sonatrach.id, content: 'Bonjour, de notre côté nous avons préparé l\'accès VPN pour vous deux. Les identifiants vous seront envoyés par email.', sentAt: new Date('2025-02-06T08:30:00') },
    { id: 'msg-004', internshipId: 'int-001', senderId: khalil.id, content: 'Merci ! J\'ai commencé à configurer Prometheus sur Docker. Amira travaille sur le dashboard Grafana. Le document comparatif sera prêt jeudi matin.', sentAt: new Date('2025-02-06T16:00:00') },
    { id: 'msg-005', internshipId: 'int-001', senderId: kadri.id, content: 'Parfait. N\'oubliez pas de documenter chaque étape — votre rapport intermédiaire est attendu pour le 15 avril.', sentAt: new Date('2025-03-10T10:00:00') },
  ];

  // Thread 2: Yacine+Beloufa+Djezzy (int-002)
  const msgs2 = [
    { id: 'msg-006', internshipId: 'int-002', senderId: yacine.id, content: 'Bonjour, j\'ai finalisé le chapitre 1 — état de l\'art sur les attaques 5G. Je l\'ai joint ici pour relecture.', sentAt: new Date('2025-03-05T09:15:00'), attachmentName: 'chapitre1_etat_art.pdf' },
    { id: 'msg-007', internshipId: 'int-002', senderId: beloufa.id, content: 'Bonne structure. Ajoute des références pour les protocoles 5G SA vs NSA dans la section 2.3. Sinon c\'est très bien.', sentAt: new Date('2025-03-05T14:30:00') },
    { id: 'msg-008', internshipId: 'int-002', senderId: djezzy.id, content: 'Compte-rendu mi-parcours planifié pour le 14 avril. Prépare une présentation de 10 min sur l\'avancement technique.', sentAt: new Date('2025-03-10T10:00:00') },
    { id: 'msg-009', internshipId: 'int-002', senderId: yacine.id, content: 'Compris. Voici la version 2 avec les références ajoutées et la maquette du système IDS.', sentAt: new Date('2025-03-18T16:45:00'), attachmentName: 'chapitre1_v2.pdf' },
    { id: 'msg-010', internshipId: 'int-002', senderId: beloufa.id, content: 'Excellent travail Yacine. On est sur la bonne voie. Prochaine étape : déploiement du prototype sur l\'infra Djezzy.', sentAt: new Date('2025-03-19T08:30:00') },
  ];

  // Thread 3: Rania+Kadri+Sonatrach (int-003)
  const msgs3 = [
    { id: 'msg-011', internshipId: 'int-003', senderId: rania.id, content: 'Bonjour ! Ma première semaine s\'est bien passée. J\'ai découvert les processus RH existants et identifié les rapports à automatiser.', sentAt: new Date('2025-03-07T17:00:00') },
    { id: 'msg-012', internshipId: 'int-003', senderId: sonatrach.id, content: 'Bienvenue Rania ! N\'hésitez pas à solliciter l\'équipe RH pour toute question. Votre encadrant terrain est M. Lounès.', sentAt: new Date('2025-03-08T09:00:00') },
    { id: 'msg-013', internshipId: 'int-003', senderId: kadri.id, content: 'Parfait Rania. Commence par cartographier les sources de données disponibles avant de te lancer sur Power BI.', sentAt: new Date('2025-03-08T11:30:00') },
  ];

  for (const msg of [...msgs1, ...msgs2, ...msgs3]) {
    await prisma.message.upsert({ where: { id: msg.id }, update: {}, create: { ...msg, requiresAction: false, attachmentName: (msg as any).attachmentName ?? null, attachmentUrl: null } });
  }
  console.log('✅  13 messages across 3 internship threads');

  // ── SYSTEM DEADLINES ──────────────────────────────────────────────────────
  for (const d of [
    { id: 'dl-001', label: 'Dépôt rapport intermédiaire PFE', dueDate: new Date('2025-04-15'), isActive: true },
    { id: 'dl-002', label: 'Dépôt rapport final (tous stages)', dueDate: new Date('2025-06-15'), isActive: true },
    { id: 'dl-003', label: 'Clôture soutenances PFE', dueDate: new Date('2025-06-30'), isActive: true },
  ]) { await prisma.systemDeadline.upsert({ where: { id: d.id }, update: {}, create: d }); }

  // ── TEACHER LOADS ─────────────────────────────────────────────────────────
  await prisma.teacherProfile.updateMany({ where: { userId: kadri.id }, data: { currentLoad: 2 } });
  await prisma.teacherProfile.updateMany({ where: { userId: beloufa.id }, data: { currentLoad: 1 } });

  console.log('\n🎉  Full demo seed complete!\n');
  console.log('┌─────────────────┬───────────────────────────────────┐');
  console.log('│ ADMIN           │ admin@esst.dz / Admin1234!         │');
  console.log('│ TEACHER 1       │ kadri@esst.dz / Teacher123!        │');
  console.log('│ TEACHER 2       │ beloufa@esst.dz / Teacher123!      │');
  console.log('│ TEACHER 3       │ merabet@esst.dz / Teacher123!      │');
  console.log('│ COMPANY Sona    │ sonatrach@demo.dz / Company123!    │');
  console.log('│ COMPANY Djezzy  │ djezzy@demo.dz / Company123!       │');
  console.log('│ COMPANY Cevital │ cevital@demo.dz / Company123!      │');
  console.log('│ STUDENT M2 (L)  │ amira@student.dz / Student123!     │ ← PFE binôme leader');
  console.log('│ STUDENT M2      │ khalil@student.dz / Student123!    │ ← PFE binôme partner');
  console.log('│ STUDENT L3      │ yacine@student.dz / Student123!    │ ← PFE solo active');
  console.log('│ STUDENT M1      │ rania@student.dz / Student123!     │ ← Normal stage active');
  console.log('│ STUDENT M2      │ sofiane@student.dz / Student123!   │ ← Pending application');
  console.log('└─────────────────┴───────────────────────────────────┘');
}

main().catch((e) => { console.error('❌', e); process.exit(1); }).finally(() => prisma.$disconnect());
