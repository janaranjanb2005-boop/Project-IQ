import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Share2,
  MessageSquare,
  CheckCircle2,
  Award,
  Sparkles,
  Clock,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ShieldCheck,
  ChevronRight,
  Send,
  Terminal,
  User,
  Maximize2,
  Minimize2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Project, Module, Review } from '../types';

interface AiMeetingRoomModalProps {
  project: Project;
  review: Review;
  onClose: () => void;
  onReviewConcluded: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'candidate';
  senderName: string;
  text: string;
  timestamp: string;
  verdict?: 'APPROVED' | 'NEEDS_CLARIFICATION' | 'PROGRESSING';
  critique?: string;
}

export const AiMeetingRoomModal: React.FC<AiMeetingRoomModalProps> = ({
  project,
  review,
  onClose,
  onReviewConcluded,
}) => {
  // Call Controls State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAiVoiceMuted, setIsAiVoiceMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'interview' | 'deliverables' | 'screen'>('interview');

  // AI Reviewer State
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [currentAiSpeech, setCurrentAiSpeech] = useState<string>('');
  const [aiConfidenceScore, setAiConfidenceScore] = useState<number>(85);
  const [aiCritique, setAiCritique] = useState<string>(
    'AI Principal Reviewer initialized. Ready to evaluate candidate deliverables.'
  );

  // Chat & Conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Verified Deliverables
  const [verifiedModuleIds, setVerifiedModuleIds] = useState<string[]>(
    project.modules.filter((m) => m.status === 'COMPLETED').map((m) => m.id)
  );

  // Media Stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasWebcamAccess, setHasWebcamAccess] = useState(false);

  // Current target module being evaluated
  const currentModule =
    project.modules.find((m) => !verifiedModuleIds.includes(m.id)) ||
    project.modules[0];

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Elapsed Time
  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Webcam Setup
  useEffect(() => {
    if (isVideoOn) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setHasWebcamAccess(true);
          }
        })
        .catch(() => {
          setHasWebcamAccess(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setHasWebcamAccess(false);
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoOn]);

  // Initial AI Greeting on room entry
  useEffect(() => {
    const triggerInitialGreeting = async () => {
      setIsAiThinking(true);
      try {
        const res = await fetch('/api/meeting/ai-interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            reviewId: review.id,
            candidateMessage: 'I have joined the meeting room and am ready for the review.',
            conversationHistory: [],
            currentModuleId: currentModule?.id,
          }),
        });

        const data = await res.json();
        if (data.spokenGreetingOrAnswer) {
          setCurrentAiSpeech(data.spokenGreetingOrAnswer);
          speakWithBrowserTts(data.spokenGreetingOrAnswer);

          setMessages([
            {
              id: 'msg_0',
              sender: 'ai',
              senderName: 'Dr. Sarah Vance (AI Evaluator)',
              text: data.spokenGreetingOrAnswer,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              verdict: data.verdict,
              critique: data.liveCritique,
            },
          ]);

          if (data.confidenceScore) setAiConfidenceScore(data.confidenceScore);
          if (data.liveCritique) setAiCritique(data.liveCritique);
        }
      } catch (err) {
        console.error('Initial greeting failed', err);
      } finally {
        setIsAiThinking(false);
      }
    };

    triggerInitialGreeting();
  }, [project.id, review.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Text-to-Speech Engine
  const speakWithBrowserTts = (text: string) => {
    if (isAiVoiceMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick a clean English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen')) && v.lang.startsWith('en')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Send message to AI Reviewer
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const candidateMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'candidate',
      senderName: project.user.name,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, candidateMsg]);
    setInputText('');
    setIsAiThinking(true);

    try {
      const historyPayload = messages.map((m) => ({
        speaker: m.sender === 'ai' ? 'Dr. Sarah Vance' : project.user.name,
        text: m.text,
      }));

      const res = await fetch('/api/meeting/ai-interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          reviewId: review.id,
          candidateMessage: text.trim(),
          conversationHistory: historyPayload,
          currentModuleId: currentModule?.id,
        }),
      });

      const data = await res.json();
      if (data.spokenGreetingOrAnswer) {
        setCurrentAiSpeech(data.spokenGreetingOrAnswer);
        speakWithBrowserTts(data.spokenGreetingOrAnswer);

        const aiMsg: ChatMessage = {
          id: 'msg_ai_' + Date.now(),
          sender: 'ai',
          senderName: 'Dr. Sarah Vance (AI Evaluator)',
          text: data.spokenGreetingOrAnswer + (data.nextInterviewQuestion ? `\n\n📌 Follow-up: "${data.nextInterviewQuestion}"` : ''),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          verdict: data.verdict,
          critique: data.liveCritique,
        };

        setMessages((prev) => [...prev, aiMsg]);
        if (data.confidenceScore) setAiConfidenceScore(data.confidenceScore);
        if (data.liveCritique) setAiCritique(data.liveCritique);

        // If AI approved deliverable, mark current module as verified!
        if (data.verdict === 'APPROVED' && currentModule) {
          if (!verifiedModuleIds.includes(currentModule.id)) {
            setVerifiedModuleIds((prev) => [...prev, currentModule.id]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to get AI meeting response', err);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(review.meetLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleVerifyModule = (modId: string) => {
    if (verifiedModuleIds.includes(modId)) {
      setVerifiedModuleIds(verifiedModuleIds.filter((id) => id !== modId));
    } else {
      setVerifiedModuleIds([...verifiedModuleIds, modId]);
    }
  };

  const handleConcludeMeeting = async () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    try {
      const res = await fetch('/api/reviews/conduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          reviewId: review.id,
          completedModuleIds: verifiedModuleIds,
          adminRating: Math.round(aiConfidenceScore / 20),
          adminNotes: `AI-Attended Live Review conducted by Dr. Sarah Vance. Progress verified: ${verifiedModuleIds.length}/${project.modules.length} modules. Live critique: ${aiCritique}`,
        }),
      });

      const data = await res.json();
      if (data.isAllCompleted) {
        confetti({ particleCount: 150, spread: 80 });
      }

      onReviewConcluded();
      onClose();
    } catch (err) {
      console.error('Failed to conclude meeting', err);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
      <div className="w-full h-full max-w-7xl bg-slate-950 border border-slate-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden relative">
        {/* Google Meet Header */}
        <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-white tracking-tight">
                  Google Meet &bull; Project IQ Review #{review.reviewRound}
                </span>
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>AI Evaluator In Room</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {project.name} &bull; Candidate: <strong className="text-slate-200">{project.user.name}</strong>
              </p>
            </div>
          </div>

          {/* Meeting Room Controls & Timer */}
          <div className="flex items-center space-x-3">
            {/* Call Duration Clock */}
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {/* Meet Link Copy Badge */}
            <button
              onClick={handleCopyLink}
              title="Copy Google Meet Link"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-mono">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-[11px] truncate max-w-[140px]">
                    {review.meetLink.replace('https://', '')}
                  </span>
                </>
              )}
            </button>

            {/* AI Voice Mute Toggle */}
            <button
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                setIsAiVoiceMuted(!isAiVoiceMuted);
              }}
              title={isAiVoiceMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isAiVoiceMuted
                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isAiVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Meeting Body: Grid (Left) + Interaction Console (Right) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950">
          {/* Main Video Stage */}
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
            {/* Split Video Feeds */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[380px]">
              {/* Participant 1: AI Principal Evaluator */}
              <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/40 p-4 flex flex-col justify-between overflow-hidden shadow-2xl group ring-1 ring-indigo-500/20">
                {/* Background glow effects */}
                <div
                  className={`absolute inset-0 bg-indigo-500/5 transition-opacity duration-500 ${
                    isAiSpeaking ? 'opacity-100' : 'opacity-30'
                  }`}
                />
                <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* AI Header Tag */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-white font-mono">
                      Dr. Sarah Vance &bull; Lead AI Evaluator
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-sky-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
                    Gemini 3.8 Flash
                  </span>
                </div>

                {/* AI Avatar & Audio Visualizer */}
                <div className="my-auto text-center space-y-4 relative z-10">
                  <div className="relative w-28 h-28 mx-auto">
                    {/* Animated Pulsing Rings when Speaking */}
                    <div
                      className={`absolute inset-0 rounded-full border-2 border-sky-400/50 transition-transform duration-700 ${
                        isAiSpeaking ? 'animate-ping scale-110' : 'scale-100 opacity-20'
                      }`}
                    />
                    <div
                      className={`absolute -inset-2 rounded-full border border-indigo-500/40 transition-all duration-300 ${
                        isAiSpeaking ? 'scale-105' : 'scale-95 opacity-20'
                      }`}
                    />

                    {/* Avatar Core */}
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-700 via-sky-600 to-indigo-500 p-[2px] shadow-xl shadow-indigo-500/30">
                      <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                        <Sparkles className="w-10 h-10 text-sky-400 animate-pulse" />
                      </div>
                    </div>
                  </div>

                  {/* Audio Waveform simulation */}
                  <div className="flex items-center justify-center space-x-1 h-6">
                    {[12, 24, 16, 28, 20, 32, 18, 26, 14, 22].map((height, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full bg-sky-400 transition-all duration-150 ${
                          isAiSpeaking ? 'opacity-100' : 'h-1 opacity-25'
                        }`}
                        style={{
                          height: isAiSpeaking ? `${(height / 32) * 24}px` : '4px',
                          animationDelay: `${i * 80}ms`,
                        }}
                      />
                    ))}
                  </div>

                  <div className="text-xs font-mono font-semibold text-slate-300">
                    {isAiThinking ? (
                      <span className="text-sky-400 animate-pulse">
                        Analyzing candidate demonstration...
                      </span>
                    ) : isAiSpeaking ? (
                      <span className="text-emerald-400">Evaluating & Speaking...</span>
                    ) : (
                      <span className="text-slate-400">Listening to Candidate Demo</span>
                    )}
                  </div>
                </div>

                {/* Real-time Subtitles / Transcript */}
                <div className="relative z-10 bg-slate-950/80 backdrop-blur-md rounded-xl p-3 border border-slate-800/80 text-xs text-slate-200">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">
                    <span>AI Spoken Transcript</span>
                    <span className="text-sky-400">Score: {aiConfidenceScore}%</span>
                  </div>
                  <p className="line-clamp-2 italic leading-relaxed text-slate-300">
                    "{currentAiSpeech || 'Welcome to your project review demo. Let us examine your deliverables.'}"
                  </p>
                </div>
              </div>

              {/* Participant 2: Candidate Webcam / Presenter Feed */}
              <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between overflow-hidden shadow-2xl">
                {/* Header Tag */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isVideoOn ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                    <span className="text-xs font-bold text-white font-mono">
                      {project.user.name} (Candidate)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono">
                    Presenter &bull; Audio Active
                  </span>
                </div>

                {/* Video Content */}
                <div className="my-auto w-full h-full max-h-[220px] rounded-xl overflow-hidden relative flex items-center justify-center bg-slate-950 border border-slate-800">
                  {isVideoOn && hasWebcamAccess ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                        <User className="w-10 h-10" />
                      </div>
                      <div className="text-xs text-slate-400">
                        {isVideoOn ? 'Webcam active (simulated feed)' : 'Camera turned off'}
                      </div>
                    </div>
                  )}

                  {/* Screen Share Preview Overlay if active */}
                  {isScreenSharing && (
                    <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center space-y-2 border-2 border-sky-500">
                      <Share2 className="w-8 h-8 text-sky-400 animate-bounce" />
                      <div className="text-xs font-bold text-white">
                        Presenting Project Screen & Codebase
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {project.name} &bull; Live Artifact Stream
                      </div>
                    </div>
                  )}
                </div>

                {/* Candidate Feed Status Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80">
                  <span>Microphone: {isMicOn ? 'Unmuted' : 'Muted'}</span>
                  <span>Video: {isVideoOn ? '1080p 30fps' : 'Disabled'}</span>
                </div>
              </div>
            </div>

            {/* Bottom In-Call Controls Bar */}
            <div className="h-16 bg-slate-900 border border-slate-800 rounded-2xl px-6 flex items-center justify-between shrink-0 shadow-xl">
              <div className="flex items-center space-x-2">
                {/* Mic toggle */}
                <button
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isMicOn
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                      : 'bg-rose-600 text-white border-rose-500'
                  }`}
                  title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                {/* Camera toggle */}
                <button
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isVideoOn
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                      : 'bg-rose-600 text-white border-rose-500'
                  }`}
                  title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>

                {/* Screen Share toggle */}
                <button
                  onClick={() => setIsScreenSharing(!isScreenSharing)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isScreenSharing
                      ? 'bg-sky-500 text-white border-sky-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                  }`}
                  title={isScreenSharing ? 'Stop Presenting' : 'Share Screen / Code'}
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* End Call / Conclude Review */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleConcludeMeeting}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Certify Review & Conclude Call</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition cursor-pointer"
                  title="Leave Call"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Interaction & Verification Console */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col bg-slate-950 shrink-0">
            {/* Drawer Tabs */}
            <div className="flex items-center border-b border-slate-800 p-1 bg-slate-900/60">
              <button
                onClick={() => setActiveTab('interview')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'interview'
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Dialogue
              </button>
              <button
                onClick={() => setActiveTab('deliverables')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'deliverables'
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Checklist ({verifiedModuleIds.length}/{project.modules.length})
              </button>
            </div>

            {activeTab === 'interview' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* AI Critique Header Card */}
                <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold text-sky-400">
                      AI Live Critique
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Confidence: {aiConfidenceScore}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">{aiCritique}</p>
                </div>

                {/* Messages Chat History */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl text-xs space-y-1 ${
                        m.sender === 'ai'
                          ? 'bg-indigo-950/40 border border-indigo-500/30 text-slate-200'
                          : 'bg-slate-900 border border-slate-800 text-white ml-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span
                          className={`font-bold ${
                            m.sender === 'ai' ? 'text-sky-400' : 'text-slate-400'
                          }`}
                        >
                          {m.senderName}
                        </span>
                        <span className="text-slate-500">{m.timestamp}</span>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

                      {m.verdict && (
                        <div className="pt-1 flex items-center space-x-1.5">
                          <span
                            className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                              m.verdict === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            AI Verdict: {m.verdict}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick Demonstration Prompts */}
                <div className="p-2 border-t border-slate-800/80 bg-slate-950 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="text-slate-500 font-mono self-center mr-1">Demo Quick-Actions:</span>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        'I have verified the database models and initial server bootstrapping. Everything runs and compiles cleanly.'
                      )
                    }
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 cursor-pointer"
                  >
                    Demonstrate Schema
                  </button>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        'Here is our core business logic and API integration, fully tested with request validation.'
                      )
                    }
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 cursor-pointer"
                  >
                    Demonstrate APIs
                  </button>
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center space-x-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Speak or respond to AI Reviewer..."
                    className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isAiThinking || !inputText.trim()}
                    className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Deliverables Verification Checklist Tab */
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Live Milestone Verification Checklist:
                </div>

                {project.modules.map((mod) => {
                  const isChecked = verifiedModuleIds.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleVerifyModule(mod.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer select-none ${
                        isChecked
                          ? 'bg-emerald-950/20 border-emerald-500/50'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2">
                          <div
                            className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-600 bg-slate-950'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{mod.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {mod.description}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            isChecked
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isChecked ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleConcludeMeeting}
                  className="w-full mt-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  Conclude Review with {verifiedModuleIds.length} Verified Modules
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
