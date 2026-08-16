"use client";

import { useState, useEffect } from "react";
import { MdOndemandVideo, MdClose } from "react-icons/md";
import { FaPlay, FaCheckCircle } from "react-icons/fa";
import { createClient } from "@/lib/supabase/client";

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url: string;
  reward_amount: number;
  duration: string;
}

type RecordVideoWatchResult = {
  success: boolean;
  message: string;
  reward?: number;
  watch_count?: number;
};

export default function WatchAdsPage() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoBank, setVideoBank] = useState<Video[]>([]);
  const [visibleVideos, setVisibleVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyCount, setDailyCount] = useState(0);
  const dailyLimit = 5;
  const supabase = createClient();

  function getRandomVideos(pool: Video[], count: number, excludedIds: Set<string> = new Set()) {
    const available = pool.filter((video) => !excludedIds.has(video.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  function refillVisibleVideos(pool: Video[], watchedIds: Set<string>) {
    const watchedVisible = visibleVideos.filter((video) => watchedIds.has(video.id));
    const watchedVisibleIds = new Set(watchedVisible.map((video) => video.id));
    const freshVideos = getRandomVideos(pool, Math.max(0, 3 - watchedVisible.length), new Set([...watchedIds, ...watchedVisibleIds]));

    return [...watchedVisible, ...freshVideos].slice(0, 3);
  }

  // Fetch videos from database
  useEffect(() => {
    async function fetchVideos() {
      try {
        const { data, error } = await supabase
          .from("watch_ads_videos")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        const activeVideos = data || [];
        setVideoBank(activeVideos);
        setVisibleVideos(getRandomVideos(activeVideos, 3));
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, []);

  // Fetch user's daily watch count and history
  useEffect(() => {
    async function fetchWatchHistory() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split("T")[0];
        
        const { data, error } = await supabase
          .from("watch_ads_history")
          .select("video_id")
          .eq("user_id", user.id)
          .eq("date", today);

        if (error) throw error;
        
        if (data) {
          const watchedIds = new Set(data.map((item) => item.video_id));
          setWatchedVideos(watchedIds);
          setDailyCount(data.length);
          setVisibleVideos((current) => {
            if (current.length === 0) {
              return getRandomVideos(videoBank, 3, watchedIds);
            }

            return refillVisibleVideos(videoBank, watchedIds);
          });
        }
      } catch (error) {
        console.error("Error fetching watch history:", error);
      }
    }

    fetchWatchHistory();
  }, [videoBank]);

  const handlePlayClick = (video: Video) => {
    setSelectedVideo(video);
    setIsVideoPlaying(true);
  };

  const handleClosePopup = () => {
    setIsVideoPlaying(false);
    setSelectedVideo(null);
  };

  const handleVideoComplete = async () => {
    if (!selectedVideo || watchedVideos.has(selectedVideo.id)) return;

    try {
      const { data, error } = await supabase.rpc("record_video_watch", {
        p_video_id: selectedVideo.id,
      });
      const result = data as RecordVideoWatchResult | null;

      if (error) throw error;

      if (result?.success) {
        // Update local state
        const newWatchedVideos = new Set(watchedVideos);
        newWatchedVideos.add(selectedVideo.id);
        setWatchedVideos(newWatchedVideos);
        setDailyCount(result.watch_count ?? dailyCount + 1);
        setVisibleVideos(refillVisibleVideos(videoBank, newWatchedVideos));
        handleClosePopup();

        // Show success message (you can add a toast notification here)
        alert(`🎉 Congratulations! You earned ${result.reward ?? 0} coins!`);
      } else {
        alert(result?.message || "Failed to record video watch");
      }
    } catch (error) {
      console.error("Error recording video watch:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const isVideoWatched = (videoId: string) => watchedVideos.has(videoId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MdOndemandVideo className="text-3xl text-blue-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Watch Ads
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Watch short ads and earn rewards instantly!
          </p>
        </div>

        {/* Progress Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Daily Progress
            </h2>
            <div className="text-2xl font-bold text-blue-600">
              {dailyCount}/{dailyLimit}
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(dailyCount / dailyLimit) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {dailyCount >= dailyLimit
              ? "🎉 Daily limit reached! Come back tomorrow for more rewards."
              : `${dailyLimit - dailyCount} videos remaining today`}
          </p>
        </div>

        {/* Video Cards Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading videos...</p>
          </div>
        ) : visibleVideos.length === 0 ? (
          <div className="text-center py-12">
            <MdOndemandVideo className="text-6xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No videos available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-300 dark:bg-gray-700">
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Play Button Overlay */}
                  {!isVideoWatched(video.id) && dailyCount < dailyLimit && (
                    <button
                      onClick={() => handlePlayClick(video)}
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-50 transition-all group"
                    >
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <FaPlay className="text-blue-600 text-2xl ml-1" />
                      </div>
                    </button>
                  )}

                  {/* Watched Badge */}
                  {isVideoWatched(video.id) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="text-center">
                        <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-2" />
                        <span className="text-white font-semibold">Watched</span>
                      </div>
                    </div>
                  )}

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {video.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Reward:
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        +{video.reward_amount} coins
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Popup Modal */}
        {isVideoPlaying && selectedVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedVideo.title}
                </h3>
                <button
                  onClick={handleClosePopup}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <MdClose className="text-2xl text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Video Player */}
              <div className="aspect-video bg-black">
                <iframe
                  src={`${selectedVideo.video_url}?autoplay=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Watch the full video to earn your reward!
                </p>
                <button
                  onClick={handleVideoComplete}
                  disabled={isVideoWatched(selectedVideo.id)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isVideoWatched(selectedVideo.id)
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  }`}
                >
                  {isVideoWatched(selectedVideo.id)
                    ? "Already Claimed"
                    : `Claim ${selectedVideo.reward_amount} Coins Reward`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}