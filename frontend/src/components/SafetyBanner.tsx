import { AlertCircle } from 'lucide-react'

interface Props {
  compact?: boolean
}

export default function SafetyBanner({ compact = false }: Props) {
  if (compact) {
    return (
      <p className="text-xs text-sage-500 text-center">
        ⚠️ MindEase is an AI wellness tool — not a medical or mental health service.
      </p>
    )
  }

  return (
    <div
      role="note"
      aria-label="Safety disclaimer"
      className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800"
    >
      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden />
      <div>
        <p className="font-medium mb-1">Important Notice</p>
        <p>
          MindEase is an AI-powered wellness companion — it is <strong>not</strong> a substitute
          for professional mental health care, therapy, or medical advice. If you are experiencing
          a mental health crisis, please contact a qualified professional or call{' '}
          <strong>iCall: 9152987821</strong>.
        </p>
      </div>
    </div>
  )
}
