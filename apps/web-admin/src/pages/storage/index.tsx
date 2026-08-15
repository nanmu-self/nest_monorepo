import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, UploadCloud, Trash2, Link as LinkIcon, Copy, Check } from 'lucide-react';
import * as qiniu from 'qiniu-js';
import type { UploadTokenResponse } from '@short-link/shared';
import { resolveErrorMessage } from '@/lib/error-message';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@short-link/ui';

import { createUploadToken, deleteFile } from '@/api/storage';

/** 单个文件的上传结果 */
interface UploadedFile {
  /** 文件访问 URL */
  url: string;
  /** 文件 key（删除用） */
  key: string;
  /** 原始文件名 */
  name: string;
  /** 文件大小（字节） */
  size: number;
}

/** 上传进度信息 */
interface UploadProgressInfo {
  /** 文件名 */
  name: string;
  /** 进度百分比 0–100 */
  percent: number;
  /** 已上传字节 */
  loaded: number;
  /** 总字节 */
  total: number;
}

/**
 * 七牛云对象存储测试页。
 *
 * 覆盖完整流程：
 * 1. 选择文件 -> 后端签发上传凭证 -> 前端用 qiniu-js SDK 直传到七牛
 * 2. 展示文件访问 URL（公开空间直接拼接）
 * 3. 删除文件（支持传 key 或完整 URL）
 *
 * 使用官方 qiniu-js SDK，内置分片上传（>4MB 自动分块）、
 * 断点续传（ctx 本地缓存一天）、MD5 校验、失败重试等能力。
 */
export default function StoragePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** 当前上传的 subscription，用于取消上传 */
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof qiniu.upload>['subscribe']> | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressInfo | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState('');

  // 组件卸载时取消未完成的上传，避免 SDK 内部 observable 持续触发 setState
  // （组件已卸载，setState 会触发 React 警告，并可能泄漏订阅的内部资源）。
  useEffect(
    () => () => {
      subscriptionRef.current?.unsubscribe();
    },
    [],
  );

  /**
   * 选择文件后用 qiniu-js SDK 直传到七牛。
   *
   * 流程：后端签发 token -> SDK upload() 自动处理分片/续传/重试 -> 拿到 key 拼 URL
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setUploading(true);
    setProgress({ name: selectedFile.name, percent: 0, loaded: 0, total: selectedFile.size });
    try {
      // 1. 后端签发上传凭证
      const tokenResp = (await createUploadToken().send()) as UploadTokenResponse;

      // 2. 用 qiniu-js SDK 上传（SDK 内部自动处理分片、断点续传、重试）
      // key 传 undefined 时七牛会用纯 hash 做文件名，丢失后缀，
      // 导致图片/视频等无法被浏览器识别类型。这里生成「时间戳+随机串.原后缀」。
      const uploadKey = generateKey(selectedFile.name);
      const observable = qiniu.upload(
        selectedFile,
        uploadKey,
        tokenResp.token,
        {
          fname: selectedFile.name,
        },
        {
          // region 值与 qiniu.region 的值类型一致：z0|z1|z2|na0|as0|cn-east-2
          region: tokenResp.region as 'z0' | 'z1' | 'z2' | 'na0' | 'as0' | 'cn-east-2',
          useCdnDomain: true,
        },
      );

      await new Promise<void>((resolve, reject) => {
        subscriptionRef.current = observable.subscribe({
          next: (res) => {
            setProgress({
              name: selectedFile.name,
              percent: Math.round(res.total.percent),
              loaded: res.total.loaded,
              total: res.total.size,
            });
          },
          error: (err) => reject(err),
          complete: () => resolve(),
        });
      });

      // 3. 拼接访问 URL
      // key 由本地上传时指定，直接复用，不依赖七牛返回值（指定 key 时返回体可能不含 key）
      const accessUrl = `${tokenResp.domain}/${uploadKey}`;

      setFiles((prev) => [
        { url: accessUrl, key: uploadKey, name: selectedFile.name, size: selectedFile.size },
        ...prev,
      ]);
    } catch (err) {
      setError(resolveErrorMessage(err, '上传失败'));
    } finally {
      setUploading(false);
      setProgress(null);
      subscriptionRef.current = null;
      // 重置 input，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /** 取消正在进行的上传 */
  const handleCancelUpload = () => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    setUploading(false);
    setProgress(null);
  };

  /** 删除已上传文件（从列表中） */
  const handleDeleteFromList = async (file: UploadedFile) => {
    setError(null);
    setDeletingKey(file.key);
    try {
      await deleteFile(file.key).send();
      setFiles((prev) => prev.filter((f) => f.key !== file.key));
    } catch (err) {
      setError(resolveErrorMessage(err, '删除失败'));
    } finally {
      setDeletingKey(null);
    }
  };

  /** 通过输入框删除（支持 key 或完整 URL） */
  const handleDeleteByInput = async () => {
    if (!deleteInput.trim()) return;
    setError(null);
    setDeletingKey(deleteInput.trim());
    try {
      await deleteFile(deleteInput.trim()).send();
      // 若列表中有同 key 的文件，一并移除
      setFiles((prev) =>
        prev.filter((f) => f.key !== deleteInput.trim() && f.url !== deleteInput.trim()),
      );
      setDeleteInput('');
    } catch (err) {
      setError(resolveErrorMessage(err, '删除失败'));
    } finally {
      setDeletingKey(null);
    }
  };

  /** 复制 URL 到剪贴板 */
  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 1500);
    } catch {
      setError('复制失败：浏览器不支持剪贴板 API');
    }
  };

  return (
    <section>
      <h1 className="admin-page-header">七牛云存储</h1>

      {/* 上传区 */}
      <div className="apple-card mb-6">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <div className="flex-between">
          <div>
            <div className="text-[15px] font-medium text-[#1d1d1f]">文件上传</div>
            <p className="text-[13px] text-[#86868b] mt-1">
              使用官方 qiniu-js SDK 直传，自动支持分片上传与断点续传（&gt;4MB 自动分块）。
            </p>
          </div>
          {uploading ? (
            <Button type="button" variant="secondary" onClick={handleCancelUpload}>
              取消上传
            </Button>
          ) : (
            <Button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={16} />
              选择文件
            </Button>
          )}
        </div>

        {/* 上传进度条 */}
        {progress && (
          <div className="mt-4">
            <div className="flex-between text-[12px] text-[#86868b] mb-1.5">
              <span className="truncate max-w-[60%]">{progress.name}</span>
              <span>
                {formatSize(progress.loaded)} / {formatSize(progress.total)} · {progress.percent}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#e5e5ea] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1d1d1f] transition-[width] duration-200 ease-out-strong"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 删除区 */}
      <div className="apple-card mb-6">
        <div className="text-[15px] font-medium text-[#1d1d1f] mb-1">删除文件</div>
        <p className="text-[13px] text-[#86868b] mb-3">
          输入文件 key 或完整访问 URL，后端会自动解析。
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 h-10 rounded-full border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] outline-none transition-[border-color] focus:border-[#1d1d1f]"
            placeholder="例如：FmX8pK3sL9.png 或 https://cdn.example.com/FmX8pK3sL9.png"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDeleteByInput()}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!deleteInput.trim() || deletingKey === deleteInput.trim()}
            onClick={handleDeleteByInput}
          >
            {deletingKey === deleteInput.trim() ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : (
              <Trash2 size={16} />
            )}
            删除
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="apple-card mb-6 border-l-4 border-[#ef4444] !p-4">
          <p className="text-[13px] text-[#ef4444] font-medium">{error}</p>
        </div>
      )}

      {/* 已上传文件列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[17px]">已上传文件</CardTitle>
          <CardDescription>
            本页上传的文件列表（刷新页面后清空，文件仍在七牛云存储中）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="flex-col-center py-12 text-center">
              <div className="flex-center w-12 h-12 rounded-full bg-[#f5f5f7] text-[#86868b] mb-3">
                <LinkIcon size={20} />
              </div>
              <p className="text-[14px] text-[#86868b]">还没有上传文件</p>
            </div>
          ) : (
            <ul className="flex-col gap-2">
              {files.map((file) => (
                <li
                  key={file.key}
                  className="flex items-center gap-3 rounded-xl border border-[#e5e5ea] p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-[#1d1d1f] truncate">
                      {file.name}
                    </div>
                    <div className="text-[12px] text-[#86868b] truncate mt-0.5">{file.url}</div>
                    <div className="text-[11px] text-[#aeaeb2] mt-0.5">
                      {formatSize(file.size)} · key: {file.key}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn shrink-0 flex-center w-8 h-8 rounded-full transition-colors"
                    onClick={() => handleCopy(file.url)}
                    title="复制链接"
                  >
                    {copiedUrl === file.url ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="icon-btn shrink-0 flex-center w-8 h-8 rounded-full transition-colors"
                    title="在新标签打开"
                  >
                    <LinkIcon size={15} />
                  </a>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger shrink-0 flex-center w-8 h-8 rounded-full transition-colors disabled:opacity-50"
                    onClick={() => handleDeleteFromList(file)}
                    disabled={deletingKey === file.key}
                    title="删除文件"
                  >
                    {deletingKey === file.key ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 生成七牛存储 key：时间戳 + 随机串 + 原始后缀。
 *
 * 不用纯 hash 做 key：七牛在 key 为 undefined 时以文件内容 hash 命名，
 * 不含后缀，浏览器无法按扩展名识别文件类型（图片不预览、视频不播放）。
 * 用「时间戳-随机串.后缀」既保留后缀又避免冲突。
 */
function generateKey(filename: string): string {
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}${ext}`;
}
