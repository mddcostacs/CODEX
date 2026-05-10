"use client";

import { Camera, Images, RefreshCw, RotateCcw, Scissors, SwitchCamera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ErpButton } from "@/components/erp/ErpButton";

type ScannerMode = "choice" | "camera" | "preview";

export function DocumentScannerModal({
  title = "Scanner de papeleta",
  accept = "image/*",
  onClose,
  onUseImage
}: {
  title?: string;
  accept?: string;
  onClose: () => void;
  onUseImage: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<ScannerMode>("choice");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [previewUrl, setPreviewUrl] = useState("");
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => stopStream(stream);
  }, [stream]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  async function startCamera(nextFacing = facingMode) {
    setMessage("");
    setMode("camera");
    stopStream(stream);
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setFacingMode(nextFacing);
      setStream(nextStream);
    } catch (error) {
      console.error("[ERP Pedidos] Falha ao abrir scanner", error);
      setMessage("Não foi possível abrir a câmera. Use a galeria ou permita acesso à câmera.");
      setMode("choice");
    }
  }

  async function toggleCamera() {
    await startCamera(facingMode === "environment" ? "user" : "environment");
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    setBusy(true);
    try {
      const file = await processVideoFrame(video);
      showPreview(file);
      stopStream(stream);
      setStream(null);
      setMode("preview");
    } finally {
      setBusy(false);
    }
  }

  async function handleGallery(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const processed = file.type.startsWith("image/") ? await processImageFile(file) : file;
      showPreview(processed);
      setMode("preview");
    } finally {
      setBusy(false);
    }
  }

  function showPreview(file: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setProcessedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setProcessedFile(null);
    startCamera(facingMode);
  }

  function useImage() {
    if (!processedFile) return;
    onUseImage(processedFile);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] bg-[#071124]/85">
      <div className="flex h-full flex-col bg-[#071124] text-white sm:m-4 sm:overflow-hidden sm:rounded-2xl">
        <header className="flex min-h-16 items-center justify-between border-b border-white/10 px-4">
          <div>
            <h2 className="text-lg font-black">{title}</h2>
            <p className="text-xs text-white/65">Capture com boa luz e mantenha a papeleta reta.</p>
          </div>
          <button className="rounded-xl p-3 text-white/80 hover:bg-white/10" onClick={onClose} aria-label="Fechar scanner"><X size={22} /></button>
        </header>

        {mode === "choice" && (
          <main className="flex flex-1 items-center justify-center p-5">
            <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
              <button className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-6 text-center text-white shadow-xl" onClick={() => startCamera("environment")}>
                <Camera size={34} className="mb-3" />
                <span className="text-lg font-black">Tirar foto com scanner</span>
                <span className="mt-2 text-sm text-white/65">Usa câmera traseira e trata a imagem.</span>
              </button>
              <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-6 text-center text-white shadow-xl">
                <Images size={34} className="mb-3" />
                <span className="text-lg font-black">Escolher arquivo da galeria</span>
                <span className="mt-2 text-sm text-white/65">Imagem já salva no aparelho.</span>
                <input className="sr-only" type="file" accept={accept} onChange={(event) => handleGallery(event.target.files?.[0])} />
              </label>
              {message && <p className="rounded-xl bg-amber-400/15 p-4 text-sm text-amber-100 sm:col-span-2">{message}</p>}
            </div>
          </main>
        )}

        {mode === "camera" && (
          <main className="relative flex-1 overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-5">
              <div className="relative aspect-[3/4] max-h-[78vh] w-[86vw] max-w-[620px] rounded-3xl border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]">
                <div className="absolute inset-x-5 top-5 rounded-xl bg-black/45 px-4 py-3 text-center text-sm font-black">Encaixe a papeleta dentro da área</div>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-3 bg-gradient-to-t from-black via-black/70 to-transparent p-5">
              <ErpButton variant="outline" icon={RotateCcw} onClick={() => setMode("choice")}>Cancelar</ErpButton>
              <ErpButton icon={Camera} onClick={capture}>{busy ? "Capturando..." : "Capturar"}</ErpButton>
              <ErpButton variant="outline" icon={SwitchCamera} onClick={toggleCamera}>Trocar câmera</ErpButton>
            </div>
          </main>
        )}

        {mode === "preview" && (
          <main className="flex flex-1 flex-col gap-4 overflow-auto p-4">
            <div className="flex flex-1 items-center justify-center rounded-2xl bg-black">
              {previewUrl && <img src={previewUrl} alt="Preview tratado da papeleta" className="max-h-[70vh] max-w-full rounded-xl object-contain" />}
            </div>
            <div className="flex flex-wrap justify-center gap-3 pb-2">
              <ErpButton variant="outline" icon={RefreshCw} onClick={retake}>Tirar novamente</ErpButton>
              <ErpButton variant="outline" icon={Scissors} onClick={() => setMessage("O corte manual fica preparado para a próxima versão. Nesta etapa aplicamos o recorte central da moldura.")}>Ajustar corte manual</ErpButton>
              <ErpButton icon={Camera} onClick={useImage}>Usar imagem</ErpButton>
            </div>
            {message && <p className="rounded-xl bg-amber-400/15 p-3 text-center text-sm text-amber-100">{message}</p>}
          </main>
        )}
      </div>
    </div>
  );
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function processVideoFrame(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível para capturar imagem.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return processCanvas(canvas, "scanner-papeleta.png");
}

async function processImageFile(file: File) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível para tratar imagem.");
  context.drawImage(image, 0, 0);
  return processCanvas(canvas, `scanner-${Date.now()}.png`);
}

function processCanvas(source: HTMLCanvasElement, fileName: string) {
  const crop = centralCrop(source.width, source.height);
  const output = document.createElement("canvas");
  const maxWidth = 1400;
  const scale = Math.min(1, maxWidth / crop.width);
  output.width = Math.round(crop.width * scale);
  output.height = Math.round(crop.height * scale);
  const context = output.getContext("2d");
  if (!context) throw new Error("Canvas indisponível para tratar imagem.");
  context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height);

  const imageData = context.getImageData(0, 0, output.width, output.height);
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrast = Math.max(0, Math.min(255, (gray - 128) * 1.28 + 138));
    data[index] = contrast;
    data[index + 1] = contrast;
    data[index + 2] = contrast;
  }
  context.putImageData(imageData, 0, 0);

  return new Promise<File>((resolve) => {
    output.toBlob((blob) => {
      resolve(new File([blob ?? new Blob()], fileName, { type: "image/png" }));
    }, "image/png", 0.95);
  });
}

function centralCrop(width: number, height: number) {
  const targetRatio = 3 / 4;
  let cropHeight = height * 0.78;
  let cropWidth = cropHeight * targetRatio;
  if (cropWidth > width * 0.86) {
    cropWidth = width * 0.86;
    cropHeight = cropWidth / targetRatio;
  }
  return {
    x: Math.max(0, Math.round((width - cropWidth) / 2)),
    y: Math.max(0, Math.round((height - cropHeight) / 2)),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight)
  };
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir a imagem."));
    };
    image.src = url;
  });
}
