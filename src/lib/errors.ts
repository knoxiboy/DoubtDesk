import { ApiError } from "./error-handler";

export class ServiceError extends ApiError {
    constructor(statusCode: number, message: string, code?: string, details?: unknown) {
        super(statusCode, message, details, code);
        this.name = "ServiceError";
    }
}
