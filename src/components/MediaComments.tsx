import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Reply, Heart, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  media_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  user: {
    username: string;
    profile_photo: string;
  };
  replies?: Reply[];
  likes_count?: number;
  user_liked?: boolean;
}

interface Reply {
  id: string;
  comment_id: string;
  user_id: string;
  reply_text: string;
  created_at: string;
  updated_at: string;
  user: {
    username: string;
    profile_photo: string;
  };
}

interface MediaCommentsProps {
  mediaId: string;
  currentUserId: string;
}

const MediaComments: React.FC<MediaCommentsProps> = ({ mediaId, currentUserId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [mediaId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // Fetch comments with user data
      const { data: commentsData, error: commentsError } = await supabase
        .from('media_comments')
        .select(`
          *,
          user:users(username, profile_photo)
        `)
        .eq('media_id', mediaId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        commentsData.map(async (comment) => {
          const { data: repliesData } = await supabase
            .from('media_replies')
            .select(`
              *,
              user:users(username, profile_photo)
            `)
            .eq('comment_id', comment.id)
            .order('created_at', { ascending: true });

          return {
            ...comment,
            replies: repliesData || [],
            likes_count: 0, // TODO: Implement likes
            user_liked: false
          };
        })
      );

      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('media_comments')
        .insert({
          media_id: mediaId,
          user_id: currentUserId,
          comment_text: newComment.trim()
        })
        .select(`
          *,
          user:users(username, profile_photo)
        `)
        .single();

      if (error) throw error;

      const newCommentData: Comment = {
        ...data,
        replies: [],
        likes_count: 0,
        user_liked: false
      };

      setComments(prev => [newCommentData, ...prev]);
      setNewComment('');
      
      toast({
        title: 'Success',
        description: 'Comment added successfully'
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim()) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('media_replies')
        .insert({
          comment_id: commentId,
          user_id: currentUserId,
          reply_text: replyText.trim()
        })
        .select(`
          *,
          user:users(username, profile_photo)
        `)
        .single();

      if (error) throw error;

      const newReply: Reply = data;

      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, replies: [...(comment.replies || []), newReply] }
            : comment
        )
      );

      setReplyText('');
      setReplyingTo(null);
      
      toast({
        title: 'Success',
        description: 'Reply added successfully'
      });
    } catch (error) {
      console.error('Error adding reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to add reply',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Add Comment */}
      <div className="flex gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src="" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button 
              onClick={handleAddComment}
              disabled={loading || !newComment.trim()}
              size="sm"
            >
              Post Comment
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-200 pb-4">
              {/* Comment */}
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.user?.profile_photo} />
                  <AvatarFallback>
                    {comment.user?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {comment.user?.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    {comment.comment_text}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <button className="flex items-center gap-1 hover:text-blue-600">
                      <Heart className="w-3 h-3" />
                      {comment.likes_count || 0}
                    </button>
                    <button 
                      onClick={() => setReplyingTo(comment.id)}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      <Reply className="w-3 h-3" />
                      Reply
                    </button>
                  </div>
                </div>
              </div>

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="ml-11 mt-3 flex gap-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[60px] resize-none text-sm"
                  />
                  <div className="flex flex-col gap-1">
                    <Button 
                      onClick={() => handleAddReply(comment.id)}
                      disabled={loading || !replyText.trim()}
                      size="sm"
                    >
                      Reply
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 mt-3 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={reply.user?.profile_photo} />
                        <AvatarFallback>
                          {reply.user?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs">
                            {reply.user?.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700">
                          {reply.reply_text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MediaComments;
