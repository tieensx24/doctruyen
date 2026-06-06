import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Clock3,
  Edit3,
  Eye,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Search as SearchIcon,
  Send,
  SmilePlus,
  Star,
  Trash2,
  User,
  Flag,
  X,
} from "lucide-react";
import MainLayout from "../components/MainLayout.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import api, { isOk } from "../api/client.js";

const PLACEHOLDER_COVER = "/logo-gao.png";
const COMMENT_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😂", "🤣", "😊", "😍", "😘",
  "😎", "🤔", "😮", "😢", "😭", "😡", "😴", "🤯", "🥳", "😇",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "👌", "🤝", "✌️", "🤟",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "💔", "💯", "✨", "🔥",
  "🎉", "🎊", "🌟", "⭐", "🌙", "☀️", "🍀", "🌸", "🌹", "⚡",
  "📚", "📖", "📝", "👀", "💬", "🕒", "🏆", "🎯", "🚀", "✅",
];
const COMMENT_REACTIONS = [
  { type: "like", icon: "👍", label: "Like" },
  { type: "love", icon: "❤️", label: "Love" },
  { type: "haha", icon: "😂", label: "Haha" },
  { type: "sad", icon: "😢", label: "Sad" },
  { type: "angry", icon: "😡", label: "Angry" },
];

function getMangaCategories(manga) {
  if (Array.isArray(manga?.categories)) return manga.categories;
  if (Array.isArray(manga?.Categories)) return manga.Categories.map((category) => category.name);
  return [];
}

function getSortedChapters(manga) {
  const chapters = Array.isArray(manga?.Chapters) ? manga.Chapters : [];
  return [...chapters].sort((a, b) => Number(b.chapter_number || 0) - Number(a.chapter_number || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function formatRating(value) {
  const rating = Number(value || 0);
  return rating ? rating.toFixed(1) : "0.0";
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function countComments(items = []) {
  return items.reduce((total, comment) => total + 1 + countComments(comment.replies || []), 0);
}

function replaceCommentInTree(items, updatedComment) {
  return items.map((comment) => {
    if (Number(comment.id) === Number(updatedComment.id)) {
      return {
        ...updatedComment,
        replies: updatedComment.replies || comment.replies || [],
      };
    }

    return {
      ...comment,
      replies: replaceCommentInTree(comment.replies || [], updatedComment),
    };
  });
}

function addReplyToTree(items, parentId, reply) {
  return items.map((comment) => {
    if (Number(comment.id) === Number(parentId)) {
      return {
        ...comment,
        replies: [...(comment.replies || []), { ...reply, replies: [] }],
      };
    }

    return {
      ...comment,
      replies: addReplyToTree(comment.replies || [], parentId, reply),
    };
  });
}

function getCommentSubtreeCount(items, commentId) {
  for (const comment of items) {
    if (Number(comment.id) === Number(commentId)) return 1 + countComments(comment.replies || []);
    const nestedCount = getCommentSubtreeCount(comment.replies || [], commentId);
    if (nestedCount) return nestedCount;
  }

  return 0;
}

function removeCommentFromTree(items, commentId) {
  return items
    .filter((comment) => Number(comment.id) !== Number(commentId))
    .map((comment) => ({
      ...comment,
      replies: removeCommentFromTree(comment.replies || [], commentId),
    }));
}

function normalizeManga(manga) {
  if (!manga) return null;

  return {
    ...manga,
    title: manga.title || "Truyện chưa đặt tên",
    author: manga.author || "Đang cập nhật",
    status: manga.status || "ongoing",
    cover_image: manga.cover_image || manga.coverImage || PLACEHOLDER_COVER,
    description: manga.description || "Truyện này chưa có mô tả.",
    view_count: Number(manga.view_count || manga.views || 0),
    comments_count: Number(manga.comments_count || manga.comments || 0),
    rating_average: Number(manga.rating_average || 0),
    rating_count: Number(manga.rating_count || 0),
    Categories: getMangaCategories(manga).map((name) => ({ name })),
    Chapters: getSortedChapters(manga),
  };
}

function getLatestChapter(manga) {
  const chapter = getSortedChapters(manga)[0];
  if (!chapter) return "Chưa có chương";
  return chapter.title || `Chương ${chapter.chapter_number}`;
}

function RelatedPanel({ items, onGoDetail }) {
  return (
    <aside className="detail-related-panel">
      <h2>Cùng thể loại</h2>
      <div className="detail-related-grid">
        {items.length ? (
          items.map((item) => (
            <button className="detail-related-card" key={item.id} onClick={() => onGoDetail?.(item)} type="button">
              <img src={item.cover_image || PLACEHOLDER_COVER} alt={item.title} />
              <strong>{item.title || "Truyện chưa đặt tên"}</strong>
              <small>{getLatestChapter(item)}</small>
            </button>
          ))
        ) : (
          <div className="empty-state">Chưa có truyện cùng thể loại.</div>
        )}
      </div>
    </aside>
  );
}

function RatingBox({ average, count, currentRating, saving, error, onRate }) {
  return (
    <div className="detail-rating-box">
      <div className="detail-rating-stars" aria-label="Đánh giá truyện">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            className={Number(currentRating || 0) >= score ? "active" : ""}
            disabled={saving}
            key={score}
            onClick={() => onRate(score)}
            type="button"
            aria-label={`Đánh giá ${score} sao`}
          >
            <Star size={16} fill="currentColor" />
          </button>
        ))}
      </div>
      <span>{formatRating(average)}{count ? ` (${formatNumber(count)})` : ""}</span>
      {error && <em>{error}</em>}
    </div>
  );
}

function EmojiPicker({ compact = false, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={compact ? "detail-emoji-picker compact" : "detail-emoji-picker"}>
      <button
        className="detail-emoji-toggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-label="Chọn emoji"
      >
        <SmilePlus size={16} />
      </button>
      {open && (
        <div className="detail-emoji-panel" role="menu" aria-label="Chọn emoji">
          {COMMENT_EMOJIS.map((emoji) => (
            <button key={emoji} onClick={() => onSelect(emoji)} type="button" role="menuitem">
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StickerPicker({ stickers = [], selectedStickerId, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  if (!stickers.length) return null;

  const selectedSticker = stickers.find((sticker) => Number(sticker.id) === Number(selectedStickerId));

  return (
    <div className="detail-sticker-picker">
      <button
        className={selectedSticker ? "detail-sticker-toggle active" : "detail-sticker-toggle"}
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-label="Chọn sticker"
      >
        <ImageIcon size={16} />
        {selectedSticker && <img src={selectedSticker.image_url} alt={selectedSticker.name} />}
      </button>
      {open && (
        <div className="detail-sticker-panel" role="menu" aria-label="Chọn sticker">
          {stickers.map((sticker) => (
            <button
              className={Number(sticker.id) === Number(selectedStickerId) ? "active" : ""}
              key={sticker.id}
              onClick={() => {
                onSelect(sticker.id);
                setOpen(false);
              }}
              type="button"
              role="menuitem"
            >
              <img src={sticker.image_url} alt={sticker.name} />
            </button>
          ))}
          {selectedSticker && (
            <button className="clear" onClick={onClear} type="button">
              Bỏ chọn
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CommentReactionPicker({ comment, onReact }) {
  const activeReaction = COMMENT_REACTIONS.find((reaction) => reaction.type === comment.current_user_reaction);
  const totalCount = COMMENT_REACTIONS.reduce((sum, reaction) => (
    sum + Number(comment.reaction_counts?.[reaction.type] || 0)
  ), 0);

  return (
    <div className="detail-comment-reaction-picker">
      <button className={activeReaction ? "reaction-main active" : "reaction-main"} type="button">
        <span>{activeReaction?.icon || "👍"}</span>
        {totalCount > 0 && <small>{totalCount}</small>}
      </button>
      <div className="reaction-flyout">
        {COMMENT_REACTIONS.map((reaction) => {
          const active = comment.current_user_reaction === reaction.type;
          const count = Number(comment.reaction_counts?.[reaction.type] || 0);

          return (
            <button
              className={active ? "active" : ""}
              key={reaction.type}
              onClick={() => onReact(comment.id, reaction.type, active)}
              type="button"
              aria-label={reaction.label}
            >
              <span>{reaction.icon}</span>
              {count > 0 && <small>{count}</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  isReply = false,
  currentUser,
  token,
  stickers,
  commentSaving,
  editingCommentId,
  editingCommentInput,
  replyingCommentId,
  replyInput,
  replyStickerId,
  onStartEdit,
  onEditInputChange,
  onEditEmojiSelect,
  onUpdate,
  onCancelEdit,
  onDelete,
  onReport,
  onReact,
  onStartReply,
  onReplyInputChange,
  onReplyEmojiSelect,
  onReplyStickerSelect,
  onClearReplySticker,
  onSubmitReply,
  onCancelReply,
}) {
  const ownerId = comment.User?.id || comment.user_id;
  const canManage = Number(currentUser?.id) === Number(ownerId) || Number(currentUser?.role_id) === 1;
  const canEdit = Number(currentUser?.id) === Number(ownerId) && Boolean(comment.content);
  const canReport = token && Number(currentUser?.id) !== Number(ownerId);
  const isEditing = Number(editingCommentId) === Number(comment.id);
  const isReplying = Number(replyingCommentId) === Number(comment.id);
  const replies = comment.replies || [];
  const edited = comment.updated_at && new Date(comment.updated_at).getTime() > new Date(comment.created_at).getTime() + 1000;

  return (
    <article className={isReply ? "detail-comment-item reply" : "detail-comment-item"}>
      <div className="detail-comment-avatar">
        {(comment.User?.username || "U").charAt(0).toUpperCase()}
      </div>
      <div className="detail-comment-body">
        <div className="detail-comment-meta">
          <strong>{comment.User?.username || "Người dùng"}</strong>
          <span>{formatDateTime(comment.created_at)}</span>
          {edited && <small>đã chỉnh sửa</small>}
        </div>

        {isEditing ? (
          <form className="detail-comment-edit-form" onSubmit={(event) => onUpdate(event, comment.id)}>
            <textarea
              value={editingCommentInput}
              onChange={(event) => onEditInputChange(event.target.value)}
              maxLength={1000}
              rows="3"
            />
            <EmojiPicker compact onSelect={onEditEmojiSelect} />
            <div className="detail-comment-edit-actions">
              <small>{editingCommentInput.trim().length}/1000 ký tự</small>
              <button disabled={commentSaving || !editingCommentInput.trim()} type="submit">
                <Check size={16} />
                Lưu
              </button>
              <button className="secondary" disabled={commentSaving} onClick={onCancelEdit} type="button">
                <X size={16} />
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <>
            {comment.content && <p>{comment.content}</p>}
            {comment.Sticker && (
              <img className="detail-comment-sticker" src={comment.Sticker.image_url} alt={comment.Sticker.name} />
            )}
          </>
        )}

        {!isEditing && (
          <div className="detail-comment-toolbar">
            <CommentReactionPicker comment={comment} onReact={onReact} />
            {token && (
              <button className="detail-comment-reply" onClick={() => onStartReply(comment)} type="button">
                <MessageCircle size={15} />
                Trả lời
              </button>
            )}
            {canReport && (
              <button className="detail-comment-report" onClick={() => onReport(comment.id)} type="button">
                <Flag size={15} />
                Báo cáo
              </button>
            )}
          </div>
        )}

        {isReplying && (
          <form className="detail-comment-reply-form" onSubmit={(event) => onSubmitReply(event, comment.id)}>
            <textarea
              value={replyInput}
              onChange={(event) => onReplyInputChange(event.target.value)}
              maxLength={1000}
              placeholder="Viết trả lời..."
              rows="2"
            />
            <EmojiPicker compact onSelect={onReplyEmojiSelect} />
            <StickerPicker
              stickers={stickers}
              selectedStickerId={replyStickerId}
              onSelect={onReplyStickerSelect}
              onClear={onClearReplySticker}
            />
            <div className="detail-comment-edit-actions">
              <small>{replyInput.trim().length}/1000 ký tự</small>
              <button disabled={commentSaving || (!replyInput.trim() && !replyStickerId)} type="submit">
                <Send size={16} />
                Gửi
              </button>
              <button className="secondary" disabled={commentSaving} onClick={onCancelReply} type="button">
                <X size={16} />
                Hủy
              </button>
            </div>
          </form>
        )}

        {replies.length > 0 && (
          <div className="detail-comment-replies">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                isReply
                currentUser={currentUser}
                token={token}
                stickers={stickers}
                commentSaving={commentSaving}
                editingCommentId={editingCommentId}
                editingCommentInput={editingCommentInput}
                replyingCommentId={replyingCommentId}
                replyInput={replyInput}
                replyStickerId={replyStickerId}
                onStartEdit={onStartEdit}
                onEditInputChange={onEditInputChange}
                onEditEmojiSelect={onEditEmojiSelect}
                onUpdate={onUpdate}
                onCancelEdit={onCancelEdit}
                onDelete={onDelete}
                onReport={onReport}
                onReact={onReact}
                onStartReply={onStartReply}
                onReplyInputChange={onReplyInputChange}
                onReplyEmojiSelect={onReplyEmojiSelect}
                onReplyStickerSelect={onReplyStickerSelect}
                onClearReplySticker={onClearReplySticker}
                onSubmitReply={onSubmitReply}
                onCancelReply={onCancelReply}
              />
            ))}
          </div>
        )}
      </div>

      {canManage && !isEditing && (
        <div className="detail-comment-actions">
          {canEdit && (
            <button
              className="detail-comment-edit"
              onClick={() => onStartEdit(comment)}
              type="button"
              aria-label="Sửa bình luận"
            >
              <Edit3 size={16} />
            </button>
          )}
          <button
            className="detail-comment-delete"
            onClick={() => onDelete(comment.id)}
            type="button"
            aria-label="Xóa bình luận"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </article>
  );
}

function CommentSection({
  comments,
  stickers,
  commentInput,
  selectedStickerId,
  replyInput,
  replyStickerId,
  commentError,
  commentLoading,
  commentSaving,
  editingCommentId,
  editingCommentInput,
  replyingCommentId,
  currentUser,
  token,
  onInputChange,
  onEmojiSelect,
  onStickerSelect,
  onClearSticker,
  onSubmit,
  onStartEdit,
  onEditInputChange,
  onEditEmojiSelect,
  onUpdate,
  onCancelEdit,
  onDelete,
  onReport,
  onReact,
  onStartReply,
  onReplyInputChange,
  onReplyEmojiSelect,
  onReplyStickerSelect,
  onClearReplySticker,
  onSubmitReply,
  onCancelReply,
  onGoAuth,
}) {
  return (
    <section className="detail-comments">
      <div className="detail-comments-head">
        <h2>
          <MessageCircle size={20} />
          Bình luận
        </h2>
        <span>{countComments(comments)} bình luận</span>
      </div>

      {token ? (
        <form className="detail-comment-form" onSubmit={onSubmit}>
          <textarea
            value={commentInput}
            onChange={(event) => onInputChange(event.target.value)}
            maxLength={1000}
            placeholder="Viết bình luận của bạn..."
            rows="3"
          />
          <EmojiPicker onSelect={onEmojiSelect} />
          <StickerPicker
            stickers={stickers}
            selectedStickerId={selectedStickerId}
            onSelect={onStickerSelect}
            onClear={onClearSticker}
          />
          <div>
            <small>{commentInput.trim().length}/1000 ký tự</small>
            <button disabled={commentSaving || (!commentInput.trim() && !selectedStickerId)} type="submit">
              <Send size={17} />
              {commentSaving ? "Đang gửi..." : "Gửi bình luận"}
            </button>
          </div>
        </form>
      ) : (
        <div className="detail-comment-login">
          <span>Đăng nhập để bình luận truyện này.</span>
          <button onClick={onGoAuth} type="button">Đăng nhập</button>
        </div>
      )}

      {commentError && <div className="detail-comment-error">{commentError}</div>}

      <div className="detail-comment-list">
        {commentLoading ? (
          <div className="empty-state">Đang tải bình luận...</div>
        ) : comments.length ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              token={token}
              stickers={stickers}
              commentSaving={commentSaving}
              editingCommentId={editingCommentId}
              editingCommentInput={editingCommentInput}
              replyingCommentId={replyingCommentId}
              replyInput={replyInput}
              replyStickerId={replyStickerId}
              onStartEdit={onStartEdit}
              onEditInputChange={onEditInputChange}
              onEditEmojiSelect={onEditEmojiSelect}
              onUpdate={onUpdate}
              onCancelEdit={onCancelEdit}
              onDelete={onDelete}
              onReport={onReport}
              onReact={onReact}
              onStartReply={onStartReply}
              onReplyInputChange={onReplyInputChange}
              onReplyEmojiSelect={onReplyEmojiSelect}
              onReplyStickerSelect={onReplyStickerSelect}
              onClearReplySticker={onClearReplySticker}
              onSubmitReply={onSubmitReply}
              onCancelReply={onCancelReply}
            />
          ))
        ) : (
          <div className="empty-state">Chưa có bình luận nào.</div>
        )}
      </div>
    </section>
  );
}

export default function MangaDetail({
  mangaId,
  user,
  onGoHome,
  onGoMangaList,
  onGoCategories,
  onGoReadingHistory,
  onGoFollowing,
  onGoAuth,
  onGoAdmin,
  onGoDetail,
  onGoChapter,
  onSearchSubmit,
  onLogout,
}) {
  const [manga, setManga] = useState(null);
  const [relatedMangas, setRelatedMangas] = useState([]);
  const [search, setSearch] = useState("");
  const [chapterSearch, setChapterSearch] = useState("");
  const [activeDetailTab, setActiveDetailTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFollowed, setIsFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [readingHistory, setReadingHistory] = useState(null);
  const [ratingInfo, setRatingInfo] = useState(null);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [comments, setComments] = useState([]);
  const [commentStickers, setCommentStickers] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentInput, setEditingCommentInput] = useState("");
  const [replyingCommentId, setReplyingCommentId] = useState(null);
  const [replyInput, setReplyInput] = useState("");
  const [replyStickerId, setReplyStickerId] = useState(null);
  const token = localStorage.getItem("doctruyen_token");

  async function loadComments() {
    if (!mangaId) {
      setComments([]);
      return;
    }

    setCommentLoading(true);
    setCommentError("");
    try {
      const requestOptions = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const response = await api.get(`/mangas/${mangaId}/comments`, requestOptions);
      if (!isOk(response)) throw new Error(response.data?.message || "Không tải được bình luận.");
      setComments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setComments([]);
      setCommentError(err.message || "Không tải được bình luận.");
    } finally {
      setCommentLoading(false);
    }
  }

  useEffect(() => {
    async function loadManga() {
      if (!mangaId) {
        setManga(null);
        setError("Thiếu mã truyện.");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/mangas/${mangaId}`);
        if (!isOk(response)) throw new Error(response.data?.message || "Không tải được chi tiết truyện.");
        setManga(normalizeManga(response.data));
      } catch (err) {
        setManga(null);
        setError(err.message || "Không tải được chi tiết truyện.");
      } finally {
        setLoading(false);
      }
    }

    loadManga();
  }, [mangaId]);

  useEffect(() => {
    async function increaseView() {
      if (!mangaId) return;

      try {
        const response = await api.post(
          `/mangas/${mangaId}/view`,
          null,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );
        if (!isOk(response)) return;
        setManga((current) => current ? {
          ...current,
          view_count: response.data.view_count,
        } : current);
      } catch {
        // View count is updated by backend only; keep UI on database data if the request fails.
      }
    }

    increaseView();
  }, [mangaId, token]);

  useEffect(() => {
    loadComments();
  }, [mangaId, token]);

  useEffect(() => {
    async function loadCommentStickers() {
      try {
        const response = await api.get("/comment-stickers");
        setCommentStickers(isOk(response) && Array.isArray(response.data) ? response.data : []);
      } catch {
        setCommentStickers([]);
      }
    }

    loadCommentStickers();
  }, []);

  const normalized = useMemo(() => normalizeManga(manga), [manga]);
  const categoryNames = getMangaCategories(normalized);
  const statusLabel = normalized?.status === "completed" ? "Hoàn thành" : "Đang cập nhật";
  const chapters = normalized?.Chapters || [];
  const firstChapter = chapters[chapters.length - 1];
  const continueChapter = readingHistory?.Chapter || firstChapter;
  const ratingAverage = ratingInfo?.rating_average ?? normalized?.rating_average ?? 0;
  const ratingCount = ratingInfo?.rating_count ?? normalized?.rating_count ?? 0;
  const currentUserRating = ratingInfo?.current_user_rating ?? null;
  const primaryCategories = categoryNames.slice(0, 2);
  const filteredChapters = useMemo(() => {
    const keyword = chapterSearch.trim().toLowerCase();
    if (!keyword) return chapters;

    return chapters.filter((chapter) => {
      const title = chapter.title || `Chapter ${chapter.chapter_number}`;
      return title.toLowerCase().includes(keyword) || String(chapter.chapter_number).includes(keyword);
    });
  }, [chapters, chapterSearch]);

  useEffect(() => {
    async function loadFavoriteStatus() {
      if (!normalized?.id || !token) {
        setIsFollowed(false);
        return;
      }

      try {
        const response = await api.get(`/favorites/${normalized.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (isOk(response)) {
          setIsFollowed(Boolean(response.data?.is_favorited));
        }
      } catch {
        setIsFollowed(false);
      }
    }

    loadFavoriteStatus();
  }, [normalized?.id, token]);

  useEffect(() => {
    async function loadReadingHistory() {
      if (!normalized?.id || !token) {
        setReadingHistory(null);
        return;
      }

      try {
        const response = await api.get(`/reading-history/${normalized.slug || normalized.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReadingHistory(isOk(response) && response.data ? response.data : null);
      } catch {
        setReadingHistory(null);
      }
    }

    loadReadingHistory();
  }, [normalized?.id, normalized?.slug, token]);

  useEffect(() => {
    async function loadRatingInfo() {
      if (!normalized?.id) {
        setRatingInfo(null);
        return;
      }

      if (!token) {
        setRatingInfo({
          manga_id: normalized.id,
          rating_average: normalized.rating_average || 0,
          rating_count: normalized.rating_count || 0,
          current_user_rating: null,
        });
        return;
      }

      try {
        const response = await api.get(`/mangas/${normalized.slug || normalized.id}/rating`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRatingInfo(isOk(response) ? response.data : null);
      } catch {
        setRatingInfo(null);
      }
    }

    loadRatingInfo();
  }, [normalized?.id, normalized?.slug, normalized?.rating_average, normalized?.rating_count, token]);

  useEffect(() => {
    async function loadRelatedMangas() {
      if (!normalized?.id) {
        setRelatedMangas([]);
        return;
      }

      try {
        const response = await api.get("/mangas");
        if (!isOk(response)) throw new Error("Không tải được truyện liên quan");

        const categoriesSet = new Set(getMangaCategories(normalized));
        const list = Array.isArray(response.data) ? response.data : [];
        const related = list
          .filter((item) => Number(item.id) !== Number(normalized.id))
          .filter((item) => getMangaCategories(item).some((name) => categoriesSet.has(name)));

        const fallback = list.filter((item) => Number(item.id) !== Number(normalized.id));
        setRelatedMangas((related.length ? related : fallback).slice(0, 6));
      } catch {
        setRelatedMangas([]);
      }
    }

    loadRelatedMangas();
  }, [normalized?.id]);

  async function toggleFollow() {
    if (!normalized) return;

    if (!token) {
      onGoAuth?.();
      return;
    }

    setFollowLoading(true);
    try {
      const response = isFollowed
        ? await api.delete(`/favorites/${normalized.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await api.post(`/favorites/${normalized.id}`, null, {
            headers: { Authorization: `Bearer ${token}` },
          });

      if (isOk(response)) {
        setIsFollowed((current) => !current);
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function submitRating(score) {
    if (!normalized) return;

    if (!token) {
      onGoAuth?.();
      return;
    }

    setRatingSaving(true);
    setRatingError("");
    try {
      const response = await api.post(
        `/mangas/${normalized.slug || normalized.id}/rating`,
        { score },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!isOk(response)) throw new Error(response.data?.message || "Không lưu được đánh giá.");

      setRatingInfo(response.data);
      setManga((current) => current ? {
        ...current,
        rating_average: response.data.rating_average,
        rating_count: response.data.rating_count,
      } : current);
    } catch (err) {
      setRatingError(err.message || "Không lưu được đánh giá.");
    } finally {
      setRatingSaving(false);
    }
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!normalized) return;

    if (!token) {
      onGoAuth?.();
      return;
    }

    const content = commentInput.trim();
    if (!content && !selectedStickerId) return;

    setCommentSaving(true);
    setCommentError("");
    try {
      const response = await api.post(
        `/mangas/${normalized.id}/comments`,
        { content: content || null, stickerId: selectedStickerId || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!isOk(response)) throw new Error(response.data?.message || "Không gửi được bình luận.");

      setComments((current) => [response.data, ...current]);
      setCommentInput("");
      setSelectedStickerId(null);
      setReplyingCommentId(null);
      setReplyInput("");
      setReplyStickerId(null);
      setManga((current) => current ? {
        ...current,
        comments_count: Number(current.comments_count || current.comments || 0) + 1,
      } : current);
    } catch (err) {
      setCommentError(err.message || "Không gửi được bình luận.");
    } finally {
      setCommentSaving(false);
    }
  }

  function appendCommentEmoji(emoji) {
    setCommentInput((current) => `${current}${emoji}`.slice(0, 1000));
  }

  function appendEditCommentEmoji(emoji) {
    setEditingCommentInput((current) => `${current}${emoji}`.slice(0, 1000));
  }

  function appendReplyCommentEmoji(emoji) {
    setReplyInput((current) => `${current}${emoji}`.slice(0, 1000));
  }

  function startEditComment(comment) {
    setEditingCommentId(comment.id);
    setEditingCommentInput(comment.content || "");
    setReplyingCommentId(null);
    setReplyInput("");
    setReplyStickerId(null);
    setCommentError("");
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentInput("");
  }

  function startReplyComment(comment) {
    setReplyingCommentId(comment.id);
    setReplyInput("");
    setReplyStickerId(null);
    setEditingCommentId(null);
    setEditingCommentInput("");
    setCommentError("");
  }

  function cancelReplyComment() {
    setReplyingCommentId(null);
    setReplyInput("");
    setReplyStickerId(null);
  }

  async function submitReplyComment(event, parentId) {
    event.preventDefault();
    if (!normalized) return;

    if (!token) {
      onGoAuth?.();
      return;
    }

    const content = replyInput.trim();
    if (!content && !replyStickerId) return;

    setCommentSaving(true);
    setCommentError("");
    try {
      const response = await api.post(
        `/mangas/${normalized.id}/comments`,
        { content: content || null, stickerId: replyStickerId || null, parentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!isOk(response)) throw new Error(response.data?.message || "Không gửi được trả lời.");

      setComments((current) => addReplyToTree(current, parentId, response.data));
      cancelReplyComment();
      setManga((current) => current ? {
        ...current,
        comments_count: Number(current.comments_count || current.comments || 0) + 1,
      } : current);
    } catch (err) {
      setCommentError(err.message || "Không gửi được trả lời.");
    } finally {
      setCommentSaving(false);
    }
  }

  async function updateComment(event, commentId) {
    event.preventDefault();

    if (!token) {
      onGoAuth?.();
      return;
    }

    const content = editingCommentInput.trim();
    if (!content) return;

    setCommentSaving(true);
    setCommentError("");
    try {
      const response = await api.put(
        `/comments/${commentId}`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!isOk(response)) throw new Error(response.data?.message || "Không sửa được bình luận.");

      setComments((current) => replaceCommentInTree(current, response.data));
      cancelEditComment();
    } catch (err) {
      setCommentError(err.message || "Không sửa được bình luận.");
    } finally {
      setCommentSaving(false);
    }
  }

  async function deleteComment(commentId) {
    if (!token) {
      onGoAuth?.();
      return;
    }

    const ok = window.confirm("Xóa bình luận này?");
    if (!ok) return;

    setCommentError("");
    try {
      const response = await api.delete(`/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!isOk(response)) throw new Error(response.data?.message || "Không xóa được bình luận.");

      const removedCount = getCommentSubtreeCount(comments, commentId) || 1;
      setComments((current) => removeCommentFromTree(current, commentId));
      setManga((current) => current ? {
        ...current,
        comments_count: Math.max(0, Number(current.comments_count || current.comments || 0) - removedCount),
      } : current);
    } catch (err) {
      setCommentError(err.message || "Không xóa được bình luận.");
    }
  }

  async function reactComment(commentId, reactionType, isActive) {
    if (!token) {
      onGoAuth?.();
      return;
    }

    setCommentError("");
    try {
      const response = isActive
        ? await api.delete(`/comments/${commentId}/reactions`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await api.post(
            `/comments/${commentId}/reactions`,
            { reaction_type: reactionType },
            { headers: { Authorization: `Bearer ${token}` } }
          );

      if (!isOk(response)) throw new Error(response.data?.message || "Không cập nhật được cảm xúc.");

      setComments((current) => replaceCommentInTree(current, response.data));
    } catch (err) {
      setCommentError(err.message || "Không cập nhật được cảm xúc.");
    }
  }

  async function reportComment(commentId) {
    if (!token) {
      onGoAuth?.();
      return;
    }

    const reason = window.prompt("Nhập lý do báo cáo bình luận này:", "spam");
    if (!reason || !reason.trim()) return;

    setCommentError("");
    try {
      const response = await api.post(
        `/comments/${commentId}/reports`,
        { reason: reason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!isOk(response)) throw new Error(response.data?.message || "Không gửi được báo cáo.");
      setCommentError("Đã gửi báo cáo bình luận cho admin xử lý.");
    } catch (err) {
      setCommentError(err.message || "Không gửi được báo cáo.");
    }
  }

  return (
    <MainLayout className="detail-page">
      <SiteHeader
        activePage="detail"
        user={user}
        onGoHome={onGoHome}
        onGoMangaList={onGoMangaList}
        onGoCategories={onGoCategories}
        onGoReadingHistory={onGoReadingHistory}
        onGoFollowing={onGoFollowing}
        onGoDetail={onGoDetail}
        onGoAuth={onGoAuth}
        onGoAdmin={onGoAdmin}
        onSearchSubmit={onSearchSubmit}
        onLogout={onLogout}
        search={search}
        setSearch={setSearch}
      />

      <main className="detail-shell">
        <div className="breadcrumb">
          <button onClick={onGoHome} type="button">Trang chủ</button>
          <span>»</span>
          <button onClick={onGoCategories} type="button">Thể loại</button>
          <span>»</span>
          <strong>{normalized?.title || "Chi tiết truyện"}</strong>
        </div>

        {loading ? (
          <div className="empty-state">Đang tải chi tiết truyện...</div>
        ) : error || !normalized ? (
          <div className="empty-state">{error || "Không tìm thấy truyện trong database."}</div>
        ) : (
          <div className="detail-layout">
            <section className="detail-main">
              <section className="detail-hero">
                <img className="detail-cover" src={normalized.cover_image} alt={normalized.title} />

                <div className="detail-hero-info">
                  <h1>{normalized.title}</h1>
                  <div className="detail-author">
                    <User size={18} />
                    <span>{normalized.author}</span>
                  </div>

                  <div className="detail-stats">
                    <span>
                      <Eye size={17} />
                      {formatNumber(normalized.view_count)}
                    </span>
                    <span>
                      <BookOpen size={17} />
                      {chapters.length} chương
                    </span>
                    <span>
                      <MessageCircle size={17} />
                      {formatNumber(normalized.comments_count)}
                    </span>
                  </div>

                  <RatingBox
                    average={ratingAverage}
                    count={ratingCount}
                    currentRating={currentUserRating}
                    saving={ratingSaving}
                    error={ratingError}
                    onRate={submitRating}
                  />

                  <div className="detail-tags">
                    {(primaryCategories.length ? primaryCategories : [statusLabel]).map((name) => (
                      <span key={name}>{name}</span>
                    ))}
                  </div>

                  <div className="detail-action-row">
                    <button className="detail-read-button" disabled={!firstChapter} onClick={() => onGoChapter?.(firstChapter, normalized)} type="button">
                      <BookOpen size={19} />
                      Đọc truyện
                    </button>
                    {readingHistory?.Chapter && (
                      <button className="detail-continue-button" onClick={() => onGoChapter?.(continueChapter, normalized)} type="button">
                        <Clock3 size={18} />
                        Đọc tiếp
                      </button>
                    )}
                    <button
                      className={isFollowed ? "detail-soft-button followed" : "detail-soft-button"}
                      disabled={followLoading}
                      onClick={toggleFollow}
                      type="button"
                    >
                      <Heart size={18} fill="currentColor" />
                      {isFollowed ? "Đã theo dõi" : "Theo dõi"}
                    </button>
                  </div>
                  {readingHistory?.Chapter && (
                    <div className="detail-reading-progress">
                      <span>
                        Đang đọc {readingHistory.Chapter.title || `Chapter ${readingHistory.Chapter.chapter_number}`}
                      </span>
                      <small>{Math.round(Number(readingHistory.progress_percent || 0))}%</small>
                    </div>
                  )}
                </div>
              </section>

              <section className="detail-tabs">
                <div className="detail-tab-head">
                  <button
                    className={activeDetailTab === "summary" ? "active" : ""}
                    onClick={() => setActiveDetailTab("summary")}
                    type="button"
                  >
                    Tóm tắt
                  </button>
                  <button
                    className={activeDetailTab === "chapters" ? "active" : ""}
                    onClick={() => setActiveDetailTab("chapters")}
                    type="button"
                  >
                    Danh sách chương
                  </button>
                  <button
                    className={activeDetailTab === "comments" ? "active" : ""}
                    onClick={() => setActiveDetailTab("comments")}
                    type="button"
                  >
                    Bình luận
                  </button>
                </div>

                {activeDetailTab === "summary" ? (
                  <p>{normalized.description}</p>
                ) : activeDetailTab === "chapters" ? (
                  <div className="detail-chapter-panel">
                    <label className="detail-chapter-search">
                      <SearchIcon size={18} />
                      <input
                        value={chapterSearch}
                        onChange={(event) => setChapterSearch(event.target.value)}
                        placeholder="Tìm theo số chương hoặc tên chương"
                      />
                    </label>

                    <div className="detail-chapter-list">
                      {filteredChapters.length ? (
                        filteredChapters.map((chapter, index) => (
                          <button
                            className="detail-chapter-item"
                            key={chapter.id || chapter.chapter_number}
                            onClick={() => onGoChapter?.(chapter, normalized)}
                            type="button"
                          >
                            <span>{index + 1}</span>
                            <strong>{chapter.title || `Chapter ${chapter.chapter_number}`}</strong>
                          </button>
                        ))
                      ) : (
                        <div className="empty-state">Không tìm thấy chương phù hợp.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <CommentSection
                    comments={comments}
                    stickers={commentStickers}
                    commentInput={commentInput}
                    selectedStickerId={selectedStickerId}
                    replyInput={replyInput}
                    replyStickerId={replyStickerId}
                    commentError={commentError}
                    commentLoading={commentLoading}
                    commentSaving={commentSaving}
                    editingCommentId={editingCommentId}
                    editingCommentInput={editingCommentInput}
                    replyingCommentId={replyingCommentId}
                    currentUser={user}
                    token={token}
                    onInputChange={setCommentInput}
                    onEmojiSelect={appendCommentEmoji}
                    onStickerSelect={setSelectedStickerId}
                    onClearSticker={() => setSelectedStickerId(null)}
                    onSubmit={submitComment}
                    onStartEdit={startEditComment}
                    onEditInputChange={setEditingCommentInput}
                    onEditEmojiSelect={appendEditCommentEmoji}
                    onUpdate={updateComment}
                    onCancelEdit={cancelEditComment}
                    onDelete={deleteComment}
                    onReport={reportComment}
                    onReact={reactComment}
                    onStartReply={startReplyComment}
                    onReplyInputChange={setReplyInput}
                    onReplyEmojiSelect={appendReplyCommentEmoji}
                    onReplyStickerSelect={setReplyStickerId}
                    onClearReplySticker={() => setReplyStickerId(null)}
                    onSubmitReply={submitReplyComment}
                    onCancelReply={cancelReplyComment}
                    onGoAuth={onGoAuth}
                  />
                )}
              </section>
            </section>

            <RelatedPanel items={relatedMangas} onGoDetail={onGoDetail} />
          </div>
        )}
      </main>
    </MainLayout>
  );
}
