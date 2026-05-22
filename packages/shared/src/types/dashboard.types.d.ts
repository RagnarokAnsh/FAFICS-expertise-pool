export interface DashboardStats {
    pendingEndorsement: number;
    pendingReview: number;
    underReview: number;
    activeInPool: number;
    changesRequested: number;
    rejected: number;
    expired: number;
    drafts: number;
    expiringIn90Days: number;
}
export interface RosterRow {
    id: string;
    referenceNumber: string;
    uidNumber: string;
    firstName: string;
    lastName: string;
    nationality: string;
    secondNationality: string | null;
    gender: string;
    email: string;
    phone: string;
    associationName: string;
    associationCountry: string;
    separationDate: string;
    approvedAt: string;
    expiresAt: string;
    preferredAreas: string[];
    languages: string[];
    expertAreas: string[];
}
