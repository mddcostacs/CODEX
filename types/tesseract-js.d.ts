declare module "tesseract.js" {
  export function recognize(
    image: File | Blob | string,
    langs?: string,
    options?: {
      logger?: (message: { status?: string; progress?: number }) => void;
    }
  ): Promise<{
    data: {
      text: string;
      confidence?: number;
    };
  }>;
}
