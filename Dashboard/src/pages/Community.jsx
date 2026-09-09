import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, User, MessageCircle, Send } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Builds the initial questions list from the translated feed data,
 * merging in the static per-question metadata (author, likes, dislikes)
 * that never changes across languages.
 */
const AUTHORS = [
  'Rajesh Farmer',
  'Priya Devi',
  'Vijay Reddy',
  'Anita Sharma',
  'Kishan Lal',
  'Sunita Bai',
  'Mohan Kumar',
  'Geeta Rani',
  'Baldev Singh',
  'Radha Devi',
];

const LIKES    = [12, 25, 18, 30, 22, 15, 20, 35, 28, 16];
const DISLIKES = [ 2,  1,  3,  0,  4,  1,  2,  0,  1,  0];

function buildQuestions(feedData) {
  return feedData.map((item, index) => ({
    id:       item.id,
    author:   AUTHORS[index],
    text:     item.text,
    likes:    LIKES[index],
    dislikes: DISLIKES[index],
    replies:  item.replies,
  }));
}

const Community = () => {
  const { t, tObj, language } = useLanguage();

  // Initialise questions from the translated feed for the current language
  const [questions, setQuestions] = useState(() =>
    buildQuestions(tObj('community.feed'))
  );
  const [newQuestion, setNewQuestion] = useState('');
  const [newReplies, setNewReplies]   = useState({});

  /**
   * When the language changes, rebuild the STATIC (predefined) questions
   * in the new language. User-added questions (those with ids that are
   * Date.now() timestamps, i.e. > 10) are preserved untouched because
   * they are user-generated content.
   */
  useEffect(() => {
    const translatedFeed = buildQuestions(tObj('community.feed'));
    setQuestions(prev => {
      // Keep any user-posted questions appended to the front
      const userQuestions = prev.filter(q => q.id > 10);
      return [...userQuestions, ...translatedFeed];
    });
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const addQuestion = () => {
    if (newQuestion.trim()) {
      const question = {
        id:       Date.now(),   // timestamp > 10, so it's treated as user content
        author:   'You',
        text:     newQuestion.trim(),
        likes:    0,
        dislikes: 0,
        replies:  [],
      };
      setQuestions(prev => [question, ...prev]);
      setNewQuestion('');
    }
  };

  const toggleLike = (qId) => {
    setQuestions(questions.map(q =>
      q.id === qId
        ? { ...q, likes: q.likes + 1, dislikes: Math.max(0, q.dislikes - 1) }
        : q
    ));
  };

  const toggleDislike = (qId) => {
    setQuestions(questions.map(q =>
      q.id === qId
        ? { ...q, dislikes: q.dislikes + 1, likes: Math.max(0, q.likes - 1) }
        : q
    ));
  };

  const addReply = (qId) => {
    const replyText = newReplies[qId]?.trim();
    if (replyText) {
      setQuestions(questions.map(q =>
        q.id === qId
          ? {
              ...q,
              replies: [...q.replies, {
                id:     Date.now(),
                author: 'You',
                text:   replyText,
              }],
            }
          : q
      ));
      setNewReplies(prev => ({ ...prev, [qId]: '' }));
    }
  };

  const updateReply = (qId, text) => {
    setNewReplies(prev => ({ ...prev, [qId]: text }));
  };

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
          {t('community', 'heading')}


        </h1>
        <p className="text-xl sm:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
          {t('community', 'subheading')}
        </p>
      </div>

      {/* Ask Question Section */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder={t('community', 'placeholder')}
            className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg resize-vertical min-h-[120px] focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 transition-all duration-300"
            rows={4}
          />
          <button
            onClick={addQuestion}
            disabled={!newQuestion.trim()}
            className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-lg"
          >
            <Send className="w-6 h-6" />
            {t('community', 'postButton')}
          </button>
        </div>
      </div>

      {/* Community Feed */}
      <div className="max-w-4xl mx-auto space-y-8">
        {questions.map((question) => (
          <div
            key={question.id}
            className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            {/* Question Header */}
            <div className="p-6 hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <User className="w-10 h-10 text-yellow-400 flex-shrink-0" />
                  <span className="font-bold text-2xl text-white">{question.author}</span>
                </div>
                <div className="flex items-center gap-4 ml-auto">
                  <button
                    onClick={() => toggleLike(question.id)}
                    className="flex items-center gap-2 bg-yellow-400/20 hover:bg-yellow-400/40 px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-yellow-400/50"
                  >
                    <ThumbsUp className="w-6 h-6" />
                    {question.likes}
                  </button>
                  <button
                    onClick={() => toggleDislike(question.id)}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-xl font-bold text-gray-300 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-600"
                  >
                    <ThumbsDown className="w-6 h-6" />
                    {question.dislikes}
                  </button>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white leading-tight mb-6">
                {question.text}
              </h3>
            </div>

            {/* Replies */}
            <div className="px-6 pb-6 space-y-4">
              {question.replies.map((reply) => (
                <div key={reply.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 border border-gray-700 hover:bg-gray-800 transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-400/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-lg text-white block mb-2 truncate">{reply.author}</span>
                      <p className="text-gray-200 leading-relaxed">{reply.text}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Reply Input */}
              <div className="flex gap-3 p-4 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 hover:border-gray-600 transition-all">
                <input
                  value={newReplies[question.id] || ''}
                  onChange={(e) => updateReply(question.id, e.target.value)}
                  placeholder={t('community', 'replyPlaceholder')}
                  className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-lg p-3 rounded-xl border border-transparent focus:border-yellow-400/50"
                />
                <button
                  onClick={() => addReply(question.id)}
                  disabled={!newReplies[question.id]?.trim()}
                  className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 text-gray-900 rounded-2xl flex items-center justify-center shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {question.replies.length === 0 && (
                <p className="text-gray-400 italic text-center py-6">{t('community', 'noReplies')}</p>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Community;
