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
  };
  students: {
    student: {
      name: string;
    };
  }[];
  teacher?: {
    name: string;
  };
  midtermDeadline?: string | null;
  finalDeadline?: string | null;
}
