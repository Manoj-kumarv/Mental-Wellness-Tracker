import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Leaf, AlertTriangle } from 'lucide-react'
import { aiApi } from '../api/ai'
import { getErrorMessage } from '../api/client'
import ReactMarkdown from 'react-markdown'
import type { ChatMessage } from '../types'

const SUGGESTED_PROMPTS = [
  "I'm feeling really anxious about my upcoming exam",
  "How can I manage study burnout?",
  "I can't focus, what should I do?",
  "Give me a quick stress relief exercise",
  "I feel like I'm falling behind everyone else",
]

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}
      role="article"
      aria-label={`${isUser ? 'You' : 'MindEase'}: ${msg.content.slice(0, 50)}...`}
    >
      {!isUser && (
        <div className="w-8 h-8 bg-sage-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Leaf className="w-4 h-4 text-white" aria-hidden />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-sage-600 text-white rounded-tr-sm'
            : 'bg-white border border-sage-100 text-sage-800 rounded-tl-sm shadow-sm'
        }`}
      >
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-sage">
            <ReactMarkdown
              components={{
                // Remove default margins for inline rendering
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return
    setError(null)

    const userMsg: ChatMessage = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await aiApi.chat(messageText.trim(), conversationId)

      if (!conversationId) {
        setConversationId(res.conversation_id)
      }

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply,
        timestamp: res.timestamp,
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      // Remove optimistic user message on failure
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading && input.trim()) {
        sendMessage(input)
      }
    }
  }

  const isFirstMessage = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-48px)] animate-fade-in">
      {/* Header */}
      <div className="flex-shrink-0 pb-3">
        <h1 className="text-2xl font-bold text-sage-900 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-sage-600" aria-hidden /> AI Companion
        </h1>
        <p className="text-sage-600 text-sm mt-1">
          Talk to MindEase — empathetic, context-aware, always available.
        </p>
      </div>

      {/* Safety notice */}
      <div className="flex-shrink-0 mb-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-amber-700">
          MindEase is an AI tool, not a therapist. For crisis support: iCall{' '}
          <strong>9152987821</strong>
        </p>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto space-y-4 pb-4"
        role="log"
        aria-live="polite"
        aria-label="Conversation with MindEase"
      >
        {/* Welcome message */}
        {isFirstMessage && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 bg-sage-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <div className="max-w-[80%] bg-white border border-sage-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
              <p className="text-sm text-sage-800 leading-relaxed">
                Hi! I'm MindEase, your AI wellness companion. 🌿
              </p>
              <p className="text-sm text-sage-700 mt-2 leading-relaxed">
                I know exam preparation — especially for NEET, JEE, GATE, and others — can be
                overwhelming. I'm here to listen, support, and help you find balance.
              </p>
              <p className="text-xs text-sage-400 mt-2">
                What's on your mind today?
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 animate-fade-in" aria-label="MindEase is typing">
            <div className="w-8 h-8 bg-sage-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-sage-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
              <div className="flex gap-1 items-center" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-sage-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center text-sm text-red-500 bg-red-50 rounded-xl py-3 px-4">
            {error} — please try again.
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts (only when no messages) */}
      {isFirstMessage && (
        <div className="flex-shrink-0 mb-3">
          <p className="text-xs text-sage-500 mb-2">Quick starters:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-xs bg-sage-50 text-sage-700 border border-sage-200 px-3 py-1.5 rounded-full hover:bg-sage-100 transition-all"
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0">
        <div className="flex gap-3 items-end bg-white border border-sage-200 rounded-2xl p-2 shadow-sm">
          <label htmlFor="chat-input" className="sr-only">
            Type your message
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none bg-transparent outline-none text-sm text-sage-800 placeholder-sage-400 py-1.5 px-2 max-h-32"
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={loading}
            aria-label="Chat message input"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-9 h-9 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-200 text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            aria-label="Send message"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" aria-hidden />
            )}
          </button>
        </div>
        <p className="text-xs text-sage-400 text-center mt-2">
          Powered by AWS Bedrock · Context-aware · Not a substitute for professional help
        </p>
      </div>
    </div>
  )
}
