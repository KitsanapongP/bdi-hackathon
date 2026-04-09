/** Custom error classes with HTTP status codes */

export class AppError extends Error {
    public statusCode: number;
    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้') {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'ไม่มีสิทธิ์เข้าถึง') {
        super(message, 401);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'ไม่พบข้อมูล') {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'ข้อมูลซ้ำกับที่มีอยู่ในระบบ') {
        super(message, 409);
    }
}
