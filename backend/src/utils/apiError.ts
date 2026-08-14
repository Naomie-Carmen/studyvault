export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: string = 'BAD_REQUEST', details?: unknown): ApiError {
    return new ApiError(message, 400, code, details);
  }

  static unauthorized(message: string = 'Non autorisé', code: string = 'UNAUTHORIZED'): ApiError {
    return new ApiError(message, 401, code);
  }

  static forbidden(message: string = 'Accès interdit', code: string = 'FORBIDDEN'): ApiError {
    return new ApiError(message, 403, code);
  }

  static notFound(message: string = 'Ressource introuvable', code: string = 'NOT_FOUND'): ApiError {
    return new ApiError(message, 404, code);
  }

  static internal(message: string = 'Erreur interne du serveur', code: string = 'INTERNAL_SERVER_ERROR'): ApiError {
    return new ApiError(message, 500, code);
  }

  static badGateway(message: string = 'Erreur de passerelle', code: string = 'BAD_GATEWAY'): ApiError {
    return new ApiError(message, 502, code);
  }
}
