import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`}></div>
  );
};

export const BusinessCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full">
      <Skeleton className="h-48 w-full" />
      <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
        <div>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <div className="flex justify-between items-center mt-4">
            <div className="space-y-2 w-1/2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-8 w-12 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
};
