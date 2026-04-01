'use client';

import { motion } from 'framer-motion';

interface PixelSpriteProps {
  id: string;
  name: string;
  bodyColor: string;
  x: number;
  y: number;
  isActive: boolean;
  isWalking: boolean;
  isWaiting?: boolean;
  facing?: 'left' | 'right' | 'back';
  carrying?: boolean;
  speech?: string | null;
  title?: string;
}

function Hair({ id }: { id: string }) {
  // Planner — long dark purple hair
  if (id === 'planner') return (
    <>
      <div className="absolute left-[14%] top-[-2%] h-[32%] w-[72%] rounded-t-full rounded-b-[35%] bg-[#4b2a74]" />
      <div className="absolute left-[8%] top-[18%] h-[28%] w-[16%] rounded-full bg-[#4b2a74]" />
    </>
  );
  // Reviewer — short brown side part
  if (id === 'reviewer') return (
    <>
      <div className="absolute left-[10%] top-[0%] h-[24%] w-[76%] rounded-t-full bg-[#3f3224]" />
      <div className="absolute right-[10%] top-[12%] h-[18%] w-[20%] -rotate-[18deg] rounded-full bg-[#3f3224]" />
    </>
  );
  // Coder — spiky dark hair
  if (id === 'coder') return (
    <>
      <div className="absolute left-[18%] top-[2%] h-[20%] w-[64%] rounded-full bg-[#2f3644]" />
      <div className="absolute left-[26%] top-[-6%] h-[18%] w-[14%] rounded-full bg-[#2f3644]" />
      <div className="absolute left-[44%] top-[-10%] h-[20%] w-[16%] rounded-full bg-[#2f3644]" />
      <div className="absolute left-[62%] top-[-4%] h-[16%] w-[12%] rounded-full bg-[#2f3644]" />
    </>
  );
  // Tester — auburn bob
  if (id === 'tester') return (
    <>
      <div className="absolute left-[12%] top-[0%] h-[26%] w-[70%] rounded-t-full bg-[#74563a]" />
      <div className="absolute right-[2%] top-[18%] h-[18%] w-[18%] rounded-full bg-[#74563a]" />
    </>
  );
  // Supervisor — short dark buzz
  return (
    <>
      <div className="absolute left-[18%] top-[6%] h-[14%] w-[52%] rounded-full bg-[#1f2937]" />
      <div className="absolute left-[58%] top-[2%] h-[12%] w-[12%] rounded-full bg-[#1f2937]" />
    </>
  );
}

export function PixelSprite({ id, name, bodyColor, x, y, isActive, isWalking, isWaiting = false, facing = 'right', carrying = false, speech = null, title }: PixelSpriteProps) {
  const walkSpeed = 0.28;
  const idleSpeed = 1.8;
  const activeSpeed = 1.0;
  const bobDuration = isWalking ? walkSpeed : isActive ? activeSpeed : idleSpeed;

  return (
    <motion.div
      className="absolute z-20"
      animate={{ left: x, top: y }}
      transition={{
        duration: 2.5,
        ease: 'easeInOut',
      }}
      style={{ transform: 'translate(-50%, -100%)' }}
    >
      {/* Speech bubble */}
      {speech && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/20 bg-black/80 px-2 py-1 text-[9px] leading-tight text-white/90"
          style={{ maxWidth: 180, whiteSpace: 'normal' }}
        >
          {speech}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-black/80" />
        </motion.div>
      )}

      {/* Whole body container */}
      <motion.div
        className="relative h-[70px] w-[42px]"
        animate={
          isWalking
            ? { y: [0, -4, 0, -4, 0], rotate: [-2, 2, -2, 2, -2] }
            : isActive
            ? { y: [0, -1, 0] }
            : { y: [0, -0.5, 0] }
        }
        transition={{ duration: isWalking ? walkSpeed * 2 : bobDuration, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)' }}
      >
        {/* Shadow */}
        <motion.div
          className="absolute bottom-0 left-1/2 h-2 w-7 -translate-x-1/2 rounded-full bg-black/35 blur-[2px]"
          animate={
            isWalking
              ? { scaleX: [0.8, 1.3, 0.8, 1.3, 0.8], scaleY: [1.2, 0.8, 1.2, 0.8, 1.2] }
              : { scaleX: [1, 1.05, 1] }
          }
          transition={{ duration: isWalking ? walkSpeed * 2 : idleSpeed, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Head */}
        <div className="absolute left-1/2 top-0 h-7 w-7 -translate-x-1/2 rounded-full border border-black/30 bg-[#d9d3c4] shadow-[inset_0_2px_0_rgba(255,255,255,0.25)]">
          <Hair id={id} />
          <div className="absolute left-1.5 top-3.5 h-1 w-1 rounded-full bg-black/70" />
          <div className="absolute right-1.5 top-3.5 h-1 w-1 rounded-full bg-black/70" />
          <div className="absolute left-1/2 top-5 h-[2px] w-3 -translate-x-1/2 rounded-full bg-black/55" />
        </div>

        {/* Neck */}
        <div className="absolute left-1/2 top-[26px] h-2 w-2 -translate-x-1/2 rounded-sm bg-[#8ea0b9]" />

        {/* Body */}
        <div
          className="absolute left-1/2 top-7 h-8 w-6 -translate-x-1/2 rounded-[4px] border border-black/30"
          style={{ backgroundColor: bodyColor }}
        >
          <div className="absolute left-[28%] top-[42%] h-[30%] w-[30%] rounded-full bg-white/20" />
          <div className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-sm bg-white/30" />
        </div>

        {/* Left arm */}
        <motion.div
          className="absolute left-1 top-7 h-5 w-1.5 origin-top rounded-full bg-[#d9d3c4]"
          animate={
            isWalking
              ? { rotate: [30, -20, 30, -20, 30] }
              : isActive
              ? { rotate: [-15, -8, -15] }
              : { rotate: [6, 10, 6] }
          }
          transition={{ duration: isWalking ? walkSpeed * 2 : bobDuration, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Right arm */}
        <motion.div
          className="absolute right-1 top-7 h-5 w-1.5 origin-top rounded-full bg-[#d9d3c4]"
          animate={
            isWalking
              ? { rotate: [-20, 30, -20, 30, -20] }
              : isActive
              ? { rotate: [15, 8, 15] }
              : { rotate: [-6, -10, -6] }
          }
          transition={{ duration: isWalking ? walkSpeed * 2 : bobDuration, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Left leg */}
        <motion.div
          className="absolute bottom-1 left-[1rem] h-5 w-1.5 origin-top rounded-full bg-[#30415d]"
          animate={
            isWalking
              ? { rotate: [25, -18, 25, -18, 25] }
              : { rotate: [1, 2, 1] }
          }
          transition={{ duration: isWalking ? walkSpeed * 2 : idleSpeed, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Right leg */}
        <motion.div
          className="absolute bottom-1 right-[1rem] h-5 w-1.5 origin-top rounded-full bg-[#30415d]"
          animate={
            isWalking
              ? { rotate: [-18, 25, -18, 25, -18] }
              : { rotate: [-1, -2, -1] }
          }
          transition={{ duration: isWalking ? walkSpeed * 2 : idleSpeed, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Document being carried */}
        {carrying && (
          <motion.div
            className="absolute -right-2 top-9 h-5 w-4 rounded-[2px] border border-[#6c5a43] bg-[#efe4cf]"
            animate={{ y: [0, -1, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-x-[18%] top-[20%] h-[10%] rounded-full bg-[#b8aea0]" />
            <div className="absolute inset-x-[18%] top-[40%] h-[10%] rounded-full bg-[#b8aea0]" />
            <div className="absolute inset-x-[18%] top-[60%] h-[10%] rounded-full bg-[#b8aea0]" />
          </motion.div>
        )}

        {/* Active glow */}
        {isActive && (
          <div className="absolute -right-1 top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
        )}
      </motion.div>

      {/* Name label */}
      <div className="mt-0.5 rounded-sm border border-black/20 bg-black/60 px-1.5 py-0.5 text-center text-[9px] uppercase tracking-[0.16em] text-white/80">
        {title || name}
      </div>
    </motion.div>
  );
}
