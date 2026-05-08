export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    image?: string | null;
  };
  senderId: string;
  internshipId: string;
  sentAt: string | Date;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
}

export interface InternshipThread {
  id: string;
  topic: {
    title: string;
    companyName?: string | null;
  };
  students: {
    student: {
      name: string;
      email: string;
    };
  }[];
  teacher?: {
    name: string;
    email: string;
  };
  midtermDeadline?: string | null;
  finalDeadline?: string | null;
}
