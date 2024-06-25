import React, { useState, useRef, useEffect } from "react";
import { SlCallIn, SlCallEnd } from "react-icons/sl";
import { HiOutlineLightBulb } from "react-icons/hi";
import TranscriptSegment from "@/components/home/assistant/transcript-segment";

function Transcript() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const transcriptContainerRef = useRef(null);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      const permissions = await navigator.permissions.query({ name: 'microphone' });
      if (permissions.state !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      const url = "ws://localhost:8000/ws/socket-server/";
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = async () => {
        const audioContext = new AudioContext({sampleRate: 16000});
        audioContextRef.current = audioContext;
        await audioContext.audioWorklet.addModule('worklet/processor.js')
          .then(() => {
            console.log('Worklet module loaded successfully');
          })
          .catch((error) => {
            console.error('Error loading worklet module:', error);
          });
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const micSource = audioContext.createMediaStreamSource(stream);
        const recorderNode = new AudioWorkletNode(audioContext, 'recorder-worklet');

        recorderNode.port.onmessage = (event) => {
          if (event.data instanceof Float32Array) {
            const int16Array = new Int16Array(event.data.length);
            for (let i = 0; i < event.data.length; i++) {
              int16Array[i] = Math.max(-1, Math.min(1, event.data[i])) * 0x7FFF;
            }
            socket.send(int16Array.buffer);
          }
        };

        micSource.connect(recorderNode);
        recorderNode.connect(audioContext.destination);
        setRecording(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "transcript") {
              setTranscript(data.message || []);
              console.log(transcript)
          }
        } catch (error) {
            console.error('Error parsing message data:', error);
            setTranscript([]);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error accessing microphone', error);
    }
  };

  const stopRecording = () => {
    const socket = socketRef.current;
    const audioContext = audioContextRef.current;
    const mediaStream = mediaStreamRef.current; 

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    if (audioContext) {
      audioContext.close();
    }

    setRecording(false);
  };

  const fetchSuggestion = () => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({'type': 'suggestion_request', 'transcript': transcript});
      socket.send(message);
    } else {
      console.error('WebSocket is not open');
    }
  }

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="pt-4 col-span-4 h-full">
      <div className="px-8 border-b border-gray-200 pb-2 flex flex-row justify-between">
        <div className="font-semibold">Transcript</div>
        <div className="flex flex-row gap-3">
          <button 
            className={`flex flex-row gap-2 items-center bg-blue-50 px-2 py-1 rounded-lg ${recording ? '' :'hidden'}`}
            onClick={fetchSuggestion}
          >
            <HiOutlineLightBulb size={18} />
            <span className="text-sm">Request Suggestion</span>
          </button>
          <button
            className={`flex flex-row gap-2 items-center text-white px-2 py-1 rounded-lg ${
              recording ? 'bg-red-600' : 'bg-call-green'
            }`}
            onClick={recording ? stopRecording : startRecording}
          >
            {recording ? <SlCallEnd size={14}/> : <SlCallIn size={14}/>}
            <span className="text-sm">
              {recording ? 'End Call' : 'Accept Call'}
            </span>
          </button>
        </div>
      </div>
      <div 
        ref={transcriptContainerRef} 
        className="overflow-y-auto w-full px-8" 
        style={{ height: 'calc(100vh - 193px)' }}
      >
        {transcript.map((segment, index) => (
          <TranscriptSegment key={index} segment={segment}/>
        ))}
      </div>
    </div>
  );
}

export default Transcript;
