'use client'

import { useState } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';

interface CSVImporterProps {
    onImport: (data: unknown[]) => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function CSVImporter({ onImport, isOpen, onClose }: CSVImporterProps) {
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStep('map');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl border border-arbor-border/50">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-arbor-text">Import Transactions</h2>
                    <button onClick={onClose} className="text-arbor-textmuted hover:text-arbor-text">Close</button>
                </div>

                {step === 'upload' && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-arbor-border/50 rounded-2xl p-12 bg-arbor-bg/30">
                        <div className="bg-arbor-mint rounded-full p-4 mb-4">
                            <Upload className="h-8 w-8 text-arbor-green" />
                        </div>
                        <p className="text-sm font-bold text-arbor-text mb-1">Upload your bank extract</p>
                        <p className="text-xs text-arbor-textmuted mb-6 text-center max-w-[280px]">
                            We&apos;ll help you map the columns in the next step.
                        </p>
                        <label className="cursor-pointer rounded-xl bg-arbor-green px-6 py-3 text-sm font-bold text-white shadow-soft transition-opacity hover:opacity-90">
                            Browse Files
                            <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                        </label>
                    </div>
                )}

                {step === 'map' && (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-3 p-4 bg-arbor-mint/20 rounded-xl border border-arbor-green/10">
                            <FileText className="h-5 w-5 text-arbor-green" />
                            <span className="text-sm font-bold text-arbor-text">{file?.name}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-arbor-textmuted uppercase tracking-wider">Date Column</label>
                                <select className="rounded-lg border border-arbor-border bg-arbor-bg px-4 py-2 text-sm">
                                    <option>Detecting automatically...</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-arbor-textmuted uppercase tracking-wider">Amount Column</label>
                                <select className="rounded-lg border border-arbor-border bg-arbor-bg px-4 py-2 text-sm">
                                    <option>Detecting automatically...</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-arbor-textmuted uppercase tracking-wider">Description Col</label>
                                <select className="rounded-lg border border-arbor-border bg-arbor-bg px-4 py-2 text-sm">
                                    <option>Detecting automatically...</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setStep('upload')}
                                className="px-4 py-2 text-sm font-bold text-arbor-text hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setIsProcessing(true)}
                                className="rounded-xl bg-arbor-green px-6 py-2.5 text-sm font-bold text-white shadow-soft"
                            >
                                Process File
                            </button>
                        </div>
                    </div>
                )}

                {isProcessing && (
                    <div className="flex flex-col items-center py-10">
                        <div className="h-12 w-12 border-4 border-arbor-green border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm font-bold text-arbor-text">Mapping transactions...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
