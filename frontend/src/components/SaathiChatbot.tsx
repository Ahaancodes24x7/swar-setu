import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, FUNCTIONS_URL } from "@/integrations/supabase/client";
import { MessageCircle, Send, X, Loader2, Sparkles, Mic, MicOff, Volume2, AlertTriangle } from "lucide-react";
import { speakText } from "@/lib/voice";

interface Message {
  role: "user" | "assistant";
  content: string;
  voiceAnalysis?: {
    accuracy: number;
    fluency: number;
    pronunciation: number;
    feedback: string;
  };
}

interface SaathiChatbotProps {
  studentName?: string;
  studentId?: string;
  isOpen: boolean;
  onClose: () => void;
  userRole?: "student" | "parent" | "teacher";
  userGrade?: string;
}

export function SaathiChatbot({ studentName = "Friend", studentId, isOpen, onClose, userRole = "student", userGrade = "3" }: SaathiChatbotProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi ${studentName}! 👋 I'm Saathi, your learning buddy!\n\n🌟 **Today's Practice is Ready!** 🌟\n\nI have some fun exercises for you today:\n\n📖 **Reading Practice** - Let's read some words together!\n🔢 **Number Games** - Count and solve fun puzzles!\n🔤 **Sound Practice** - Learn cool letter sounds!\n\nWhich one would you like to try first? Or just say "Start my practice!" and I'll give you questions from all three! 🎉\n\n🎤 **Tip:** Click the microphone button to speak your answers!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const CHAT_URL = `${FUNCTIONS_URL}/saathi-chat`;
  const VOICE_URL = `${FUNCTIONS_URL}/analyze-voice-practice`;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Extract the current reading/speaking prompt from the last assistant message
  useEffect(() => {
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistantMsg) {
      // Look for quoted text to read
      const quoteMatch = lastAssistantMsg.content.match(/["']([^"']+)["']/);
      if (quoteMatch) {
        setCurrentPrompt(quoteMatch[1]);
      } else {
        // Look for content after "read:" or "say:"
        const readMatch = lastAssistantMsg.content.match(/(?:read|say|speak)[:\s]+([^\n?]+)/i);
        if (readMatch) {
          setCurrentPrompt(readMatch[1].trim());
        }
      }
    }
  }, [messages]);

  const startRecording = useCallback(async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") 
          ? "audio/webm" 
          : "audio/mp4",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      
      // Provide specific error messages based on error type
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setMicError("❌ Microphone access denied. Enable microphone in browser settings and refresh the page.");
        } else if (err.name === "NotFoundError" || err.name === "NotSupported") {
          setMicError("❌ No microphone device found. Check that your microphone is connected.");
        } else if (err.name === "SecurityError") {
          setMicError("❌ Microphone access blocked. Try HTTPS or a different browser.");
        } else {
          setMicError(`❌ Microphone error: ${err.message}`);
        }
      } else {
        setMicError("❌ Could not access microphone. Please check your browser permissions.");
      }
    }
  }, []);

  const stopRecordingAndAnalyze = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    setIsRecording(false);
    setIsProcessingVoice(true);

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || "audio/webm" 
        });
        
        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());

        if (!currentPrompt) {
          // No prompt to analyze against, just transcribe and send as text
          setIsProcessingVoice(false);
          resolve();
          return;
        }

        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          formData.append("prompt_text", currentPrompt);
          formData.append("language", language.code || "en");

          const response = await fetch(VOICE_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Voice analysis failed");
          }

          const result = await response.json();

          // Add user message with voice analysis
          const userMessage: Message = { 
            role: "user", 
            content: result.transcription || "(No speech detected)",
            voiceAnalysis: {
              accuracy: result.accuracy_score,
              fluency: result.fluency_score,
              pronunciation: result.pronunciation_score,
              feedback: result.feedback,
            }
          };
          setMessages((prev) => [...prev, userMessage]);

          // Add assistant response with feedback
          const assistantMessage: Message = {
            role: "assistant",
            content: `${result.feedback}\n\n📊 **Your Scores:**\n- 🎯 Accuracy: ${result.accuracy_score}%\n- 🗣️ Pronunciation: ${result.pronunciation_score}%\n- 💨 Fluency: ${result.fluency_score}%\n\nWant to try again or move to the next practice? 🌟`,
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Save session if we have studentId
          if (studentId && user) {
            await supabase.from("voice_practice_sessions").insert({
              student_id: studentId,
              parent_id: user.id,
              prompt_text: currentPrompt,
              spoken_text: result.transcription,
              pronunciation_score: result.pronunciation_score,
              fluency_score: result.fluency_score,
              hesitation_count: result.hesitation_count,
              pause_duration_ms: result.pause_duration_ms,
              accuracy_score: result.accuracy_score,
              feedback: result.feedback,
            });
          }
        } catch (error) {
          console.error("Voice analysis error:", error);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Oops! I had trouble hearing you. Can you try again? Make sure to speak clearly into the microphone. 🎤",
            },
          ]);
        } finally {
          setIsProcessingVoice(false);
          resolve();
        }
      };

      mediaRecorderRef.current!.stop();
    });
  }, [currentPrompt, language.code, studentId, user, VOICE_URL]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          studentName,
          language: language.name,
          userRole,
          userGrade,
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to connect to Saathi");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Saathi error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Oops! I had a little hiccup. Can you try again? 🙈",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      await stopRecordingAndAnalyze();
    } else {
      await startRecording();
    }
  };

  if (!isOpen) return null;

  const hasMicSupport = typeof navigator !== "undefined" && navigator.mediaDevices;

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 w-[min(20rem,calc(100vw-2rem))] md:w-96 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
      {/* Header */}
      <div className="gradient-hero p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-background/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="text-primary-foreground font-semibold">Saathi</span>
            <p className="text-xs text-primary-foreground/80">Your learning buddy</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          aria-label="Close chat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Microphone Warning */}
      {micError && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{micError}</span>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="h-80 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx}>
              <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => speakText(msg.content, language.code)}
                      className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                      title="Listen"
                    >
                      <Volume2 className="h-3 w-3" /> Listen
                    </button>
                  )}
                </div>
              </div>
              
              {/* Voice Analysis Results */}
              {msg.voiceAnalysis && (
                <div className="mt-2 ml-2 p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Volume2 className="h-3 w-3" />
                    Voice Analysis
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-20">Accuracy</span>
                      <Progress value={msg.voiceAnalysis.accuracy} className="h-2 flex-1" />
                      <span className="text-xs w-8">{msg.voiceAnalysis.accuracy}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-20">Fluency</span>
                      <Progress value={msg.voiceAnalysis.fluency} className="h-2 flex-1" />
                      <span className="text-xs w-8">{msg.voiceAnalysis.fluency}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          
          {isProcessingVoice && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Analyzing your speech...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 flex items-center justify-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs font-medium text-destructive">Recording... Tap mic to stop</span>
        </div>
      )}

      {/* Current Prompt Indicator */}
      {currentPrompt && !isRecording && (
        <div className="px-4 py-2 bg-primary/5 border-t border-primary/20 flex items-center gap-2">
          <Mic className="h-3 w-3 text-primary" />
          <span className="text-xs text-muted-foreground">Try reading: <strong>"{currentPrompt}"</strong></span>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type or speak..."
          className="flex-1"
          disabled={isLoading || isRecording || isProcessingVoice}
        />
        
        {hasMicSupport && (
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            onClick={handleMicClick}
            disabled={isLoading || isProcessingVoice}
            className="shrink-0"
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        )}
        
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={!input.trim() || isLoading || isRecording || isProcessingVoice}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
