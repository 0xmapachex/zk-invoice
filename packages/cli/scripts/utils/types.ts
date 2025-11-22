import { type Invoice } from "../../../api/src/types/api";
export type InvoiceAPIResponse = { success: boolean, message: string, data: Invoice[] };
