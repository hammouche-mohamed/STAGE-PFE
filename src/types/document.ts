export type DocumentType = 'PROGRESS_REPORT' | 'MID_REPORT' | 'FINAL_REPORT' | 'OTHER';
export type DocumentStatus = 'UPLOADED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';

export interface InternshipDocument {
  id: string;
  internshipId: string;
  uploadedById: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  version: number;
  status: DocumentStatus;
  reviewComment?: string | null;
  reviewedById?: string | null;
  approvedByTeacher: boolean;
  approvedByCompany: boolean;
  reviewedByCompany?: string | null;
  companyComment?: string | null;
  uploadedBy?: { name: string };
  uploadedAt: string | Date;
}
