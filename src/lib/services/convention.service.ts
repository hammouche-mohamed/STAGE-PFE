import PDFDocument from "pdfkit";
import prisma from "../prisma";
import { format } from "date-fns";

/**
 * FR-A4: Generate the official internship convention PDF for a given
 * internship. The convention is a multi-party agreement between ESST,
 * the host organization and the student(s) — it carries internship
 * subject, dates, supervisors, and signature blocks.
 *
 * Returns a Buffer containing the PDF bytes so the route handler can
 * stream it to the browser as `application/pdf`.
 */
export class ConventionService {
  static async generate(internshipId: string): Promise<Buffer> {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: {
        topic: {
          include: {
            proposedBy: { select: { name: true, email: true } },
            filiere: { select: { name: true } },
          },
        },
        user: { select: { name: true, email: true } },
        internshipstudent: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                studentprofile: {
                  select: { studentId: true, promotion: true, speciality: true, level: true },
                },
              },
            },
          },
        },
      },
    });

    if (!internship) throw new Error("Internship not found");

    // Defer to a buffer so the caller can stream it.
    const doc = new PDFDocument({ size: "A4", margins: { top: 60, bottom: 60, left: 60, right: 60 } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    // ── Header ───────────────────────────────────────────────────────────────
    doc
      .fontSize(11)
      .fillColor("#475569")
      .text("École Supérieure des Sciences et Technologies (ESST)", { align: "center" })
      .moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor("#94a3b8")
      .text("Internship Management Portal — Official Document", { align: "center" })
      .moveDown(1.2);

    doc
      .fontSize(20)
      .fillColor("#1e293b")
      .text("INTERNSHIP CONVENTION", { align: "center" })
      .moveDown(0.2);
    doc
      .fontSize(10)
      .fillColor("#94a3b8")
      .text(`Reference: ${internship.id}`, { align: "center" })
      .moveDown(1.5);

    // ── Parties section ──────────────────────────────────────────────────────
    section(doc, "1. PARTIES TO THE CONVENTION");

    fieldRow(doc, "Academic year", internship.academicYear);
    fieldRow(doc, "Internship type", internship.internshipType ?? "—");
    fieldRow(doc, "Department / Filière", internship.topic.filiere?.name ?? "—");
    doc.moveDown(0.5);

    // ── Topic ────────────────────────────────────────────────────────────────
    section(doc, "2. INTERNSHIP SUBJECT");
    fieldRow(doc, "Title", internship.topic.title);
    if (internship.topic.requiredSkills) {
      fieldRow(doc, "Required skills", internship.topic.requiredSkills);
    }
    doc.fontSize(10).fillColor("#475569").text("Description:", { underline: false }).moveDown(0.2);
    doc
      .fontSize(10)
      .fillColor("#1e293b")
      .text(internship.topic.description || "—", { align: "justify" })
      .moveDown(0.7);

    // ── Student(s) ───────────────────────────────────────────────────────────
    section(doc, "3. STUDENT(S)");
    for (const s of internship.internshipstudent) {
      const u = s.user as any;
      const profile = u.studentprofile;
      const lines = [
        `${u.name}${s.isLeader ? "  (binôme leader)" : ""}`,
        profile?.studentId ? `Student ID: ${profile.studentId}` : null,
        profile ? `${profile.level || "—"} • ${profile.speciality || "—"} • Promotion ${profile.promotion || "—"}` : null,
        u.email,
      ].filter(Boolean) as string[];
      bullet(doc, lines.join("\n"));
    }
    doc.moveDown(0.5);

    // ── Academic supervisor ──────────────────────────────────────────────────
    section(doc, "4. ACADEMIC SUPERVISOR");
    fieldRow(doc, "Name", internship.user?.name ?? "—");
    fieldRow(doc, "Email", internship.user?.email ?? "—");
    doc.moveDown(0.5);

    // ── Host organization ────────────────────────────────────────────────────
    section(doc, "5. HOST ORGANIZATION");
    fieldRow(doc, "Company", internship.topic.companyName ?? internship.topic.proposedBy?.name ?? "—");
    if (internship.topic.companySector) fieldRow(doc, "Sector", internship.topic.companySector);
    if (internship.topic.companyAddress) fieldRow(doc, "Address", internship.topic.companyAddress);
    if (internship.topic.companyCity) fieldRow(doc, "City / Wilaya", internship.topic.companyCity);
    if (internship.topic.contactPerson) fieldRow(doc, "Contact", internship.topic.contactPerson);
    if (internship.topic.contactEmail) fieldRow(doc, "Email", internship.topic.contactEmail);
    if (internship.topic.contactPhone) fieldRow(doc, "Phone", internship.topic.contactPhone);
    if (internship.technicalSupervisorName)
      fieldRow(doc, "Technical supervisor", internship.technicalSupervisorName);
    if (internship.technicalSupervisorEmail)
      fieldRow(doc, "Technical supervisor email", internship.technicalSupervisorEmail);
    doc.moveDown(0.5);

    // ── Dates & deadlines ────────────────────────────────────────────────────
    section(doc, "6. PERIOD & MILESTONES");
    fieldRow(doc, "Start date", internship.startDate ? format(internship.startDate, "PPP") : "To be defined");
    fieldRow(doc, "End date", internship.endDate ? format(internship.endDate, "PPP") : "To be defined");
    if (internship.midtermDeadline)
      fieldRow(doc, "Mid-term report deadline", format(internship.midtermDeadline, "PPP"));
    if (internship.finalDeadline)
      fieldRow(doc, "Final report deadline", format(internship.finalDeadline, "PPP"));
    doc.moveDown(0.5);

    // ── Obligations / clauses ────────────────────────────────────────────────
    section(doc, "7. OBLIGATIONS OF THE PARTIES");
    doc
      .fontSize(10)
      .fillColor("#1e293b")
      .text(
        "The student undertakes to attend the internship in accordance with the schedule, to comply with " +
          "the internal rules of the host organization and to maintain the confidentiality of any information " +
          "to which they may have access. The host organization undertakes to provide the student with " +
          "a working environment compatible with the educational objectives of the internship and to " +
          "designate a technical supervisor. The academic supervisor will follow the student's progress " +
          "and validate the deliverables required by ESST.",
        { align: "justify" },
      )
      .moveDown(1.2);

    // ── Signatures ───────────────────────────────────────────────────────────
    section(doc, "8. SIGNATURES");
    const signaturesY = doc.y;
    const colWidth = (doc.page.width - 120) / 3;
    signatureBlock(doc, "The student(s)", 60, signaturesY, colWidth);
    signatureBlock(doc, "The academic supervisor", 60 + colWidth, signaturesY, colWidth);
    signatureBlock(doc, "The host organization", 60 + colWidth * 2, signaturesY, colWidth);

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.fontSize(8).fillColor("#94a3b8").text(
      `Document generated on ${format(new Date(), "PPP 'at' p")} — ESST Internship Portal`,
      60,
      doc.page.height - 50,
      { align: "center", width: doc.page.width - 120 },
    );

    doc.end();
    return finished;
  }
}

// ─── Layout helpers ─────────────────────────────────────────────────────────
function section(doc: PDFKit.PDFDocument, title: string) {
  doc
    .moveDown(0.6)
    .fontSize(11)
    .fillColor("#4f46e5")
    .text(title, { underline: false })
    .moveTo(60, doc.y)
    .lineTo(doc.page.width - 60, doc.y)
    .strokeColor("#e2e8f0")
    .stroke()
    .moveDown(0.4);
}

function fieldRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  const y = doc.y;
  doc.fontSize(10).fillColor("#64748b").text(label, 60, y, { width: 160, continued: false });
  doc.fontSize(10).fillColor("#1e293b").text(value, 220, y, { width: doc.page.width - 280 });
  doc.moveDown(0.25);
}

function bullet(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(10).fillColor("#1e293b").text(`• ${text}`, { indent: 8 }).moveDown(0.3);
}

function signatureBlock(doc: PDFKit.PDFDocument, label: string, x: number, y: number, width: number) {
  doc
    .fontSize(9)
    .fillColor("#64748b")
    .text(label, x, y, { width, align: "center" });
  doc
    .moveTo(x + 10, y + 70)
    .lineTo(x + width - 10, y + 70)
    .strokeColor("#94a3b8")
    .stroke();
  doc
    .fontSize(8)
    .fillColor("#94a3b8")
    .text("Signature & date", x, y + 75, { width, align: "center" });
}
