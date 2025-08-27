import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BACKEND_URL = "https://your-backend-url.onrender.com";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [clientId, setClientId] = useState("");
  const [venues, setVenues] = useState([]);
  const [message, setMessage] = useState("");

  // ----------- Create Room -----------
  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: "Test User",
          roomName: "Demo Room",
          password: ""
        })
      });
      const data = await res.json();
      if (data.success) {
        setRoomId(data.roomId);
        setMessage(`Room created: ${data.roomId}`);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage("Error creating room");
    } finally {
      setLoading(false);
    }
  };

  // ----------- Join Room -----------
  const joinRoom = async () => {
    if (!roomId) {
      setMessage("Enter a room ID first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/join-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          displayName: "Guest User",
          password: ""
        })
      });
      const data = await res.json();
      if (data.success) {
        setClientId(data.clientId);
        setMessage(`Joined room ${roomId} as ${data.clientId}`);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage("Error joining room");
    } finally {
      setLoading(false);
    }
  };

  // ----------- Search Venues -----------
  const searchVenues = async () => {
    if (!roomId) {
      setMessage("Join a room first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/search-venues?lat=17.385044&lon=78.486671&query=hospital`
      );
      const data = await res.json();
      if (data.success) {
        setVenues(data.venues);
        setMessage(`Found ${data.venues.length} venues`);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage("Error searching venues");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl rounded-2xl">
        <CardContent className="flex flex-col gap-4 p-6">
          <h1 className="text-2xl font-bold text-center mb-4">🌍 GeoMeet</h1>

          {/* Buttons */}
          <Button onClick={createRoom} className="w-full">
            Create Room
          </Button>
          <Button onClick={joinRoom} className="w-full">
            Join Room
          </Button>
          <Button onClick={searchVenues} className="w-full">
            Search Venues
          </Button>

          {/* Status message */}
          {message && <p className="text-sm text-gray-600">{message}</p>}

          {/* Venues list */}
          {venues.length > 0 && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">Nearby Venues</h2>
              <ul className="space-y-2">
                {venues.map((v, i) => (
                  <li key={i} className="p-2 bg-gray-50 rounded-lg shadow-sm">
                    <p className="font-medium">{v.name}</p>
                    <p className="text-sm text-gray-500">{v.category}</p>
                    <p className="text-xs text-gray-400">{v.address}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
              <p className="text-gray-700 font-medium">Please wait...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
