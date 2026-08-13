import React, { useState } from 'react';
import { Star, Trash2, CornerDownLeft, ShieldAlert } from 'lucide-react';
import { Review, Language, User } from '../types';

interface ReviewListProps {
  reviews?: Review[];
  lang: Language;
  t: any;
  currentUser: User | null;
  onAddReview: (author: string, rating: number, comment: string) => void;
  onDeleteReview?: (reviewId: string) => void;
  onAddReply?: (reviewId: string, replyText: string) => void;
  isAdmin: boolean;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  reviews = [],
  lang,
  t,
  currentUser,
  onAddReview,
  onDeleteReview,
  onAddReply,
  isAdmin
}) => {
  const [authorName, setAuthorName] = useState(currentUser ? currentUser.username : '');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const author = currentUser ? currentUser.username : authorName.trim() || (lang === 'ar' ? 'زائر' : 'Guest');
    onAddReview(author, rating, comment.trim());
    setComment('');
    if (!currentUser) setAuthorName('');
  };

  const handleReplySubmit = (reviewId: string) => {
    const text = replyText[reviewId];
    if (text && text.trim() && onAddReply) {
      onAddReply(reviewId, text.trim());
      setReplyText(prev => ({ ...prev, [reviewId]: '' }));
      setActiveReplyId(null);
    }
  };

  return (
    <div className="p-6 md:p-12 border-t border-gray-150 dark:border-slate-700 bg-gray-50/40 dark:bg-slate-900/10">
      <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center gap-2">
        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
        {t.reviewsAndComments}
      </h3>

      {/* Reviews List */}
      <div className="space-y-4 mb-8">
        {reviews.length > 0 ? (
          reviews.map(r => (
            <div 
              key={r.id} 
              className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col gap-3 animate-fadeIn"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 dark:text-slate-200 text-sm">{r.author}</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">{r.createdAt}</span>
                  </div>
                  
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        className={`h-3 w-3 ${star <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-slate-700'}`} 
                      />
                    ))}
                  </div>
                  
                  <p className="text-gray-600 dark:text-slate-350 text-xs md:text-sm whitespace-pre-wrap mt-1">
                    {r.comment}
                  </p>
                </div>
                
                {isAdmin && onDeleteReview && (
                  <button 
                    onClick={() => onDeleteReview(r.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors ml-2"
                    title={lang === 'ar' ? 'حذف التعليق' : 'Delete review'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Owner Reply Render */}
              {(r as any).reply && (
                <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border-l-2 border-red-500 dark:border-red-650 ml-6 flex gap-2">
                  <CornerDownLeft className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-gray-800 dark:text-slate-200">
                      {lang === 'ar' ? 'رد صاحب العمل:' : 'Owner Reply:'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">
                      {(r as any).reply}
                    </p>
                  </div>
                </div>
              )}

              {/* Admin or Owner Reply Form */}
              {isAdmin && !(r as any).reply && onAddReply && (
                <div className="ml-6">
                  {activeReplyId === r.id ? (
                    <div className="flex gap-2 items-center mt-2">
                      <input
                        type="text"
                        placeholder={lang === 'ar' ? 'اكتب رد صاحب العمل هنا...' : 'Write owner reply here...'}
                        value={replyText[r.id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [r.id]: e.target.value }))}
                        className="flex-1 p-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-xs outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <button
                        onClick={() => handleReplySubmit(r.id)}
                        className="bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-lg"
                      >
                        {lang === 'ar' ? 'رد' : 'Reply'}
                      </button>
                      <button
                        onClick={() => setActiveReplyId(null)}
                        className="text-gray-400 hover:text-gray-600 text-xs px-2"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveReplyId(r.id)}
                      className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1 mt-1"
                    >
                      <CornerDownLeft className="h-3 w-3" />
                      {lang === 'ar' ? 'إضافة رد كصاحب العمل' : 'Add reply as owner'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-400 dark:text-slate-500 text-center py-6 text-xs font-medium">{t.noReviewsYet}</p>
        )}
      </div>

      {/* Write Review Form */}
      {currentUser ? (
        <form 
          onSubmit={handleSubmitReview} 
          className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4"
        >
          <h4 className="font-bold text-gray-850 dark:text-slate-100 text-sm md:text-base">
            {t.writeReview}
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{t.authorName}</label>
              <input
                type="text"
                disabled
                value={currentUser.username}
                className="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-100 dark:bg-slate-900 text-gray-500 text-sm outline-none font-bold"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{t.rating}</label>
              <div className="flex items-center gap-1.5 h-10">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="hover:scale-110 transition-transform focus:outline-none"
                    aria-label={`Rate ${star} Stars`}
                  >
                    <Star 
                      className={`h-6 w-6 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-slate-650'}`} 
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-slate-500">
              {lang === 'ar' ? 'التعليق' : 'Comment'}
            </label>
            <textarea
              required
              rows={3}
              placeholder={t.commentPlaceholder}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs md:text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors"
          >
            {t.submitReview}
          </button>
        </form>
      ) : (
        <div className="p-5 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-250 dark:border-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-2xl text-xs md:text-sm font-semibold flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-yellow-600 shrink-0" />
          <div>
            <span>{lang === 'ar' ? 'يرجى تسجيل الدخول أولاً للمشاركة وكتابة تقييم لهذه المنشأة.' : 'Please sign in first to submit your rating and review for this business.'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
