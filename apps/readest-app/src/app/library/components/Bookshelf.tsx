import clsx from 'clsx';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { MdDelete, MdOpenInNew, MdOutlineCreateNewFolder, MdOutlineCancel } from 'react-icons/md';
import { PiPlus } from 'react-icons/pi';
import { Book, BooksGroup } from '@/types/book';
import { useEnv } from '@/context/EnvContext';
import { useLibraryStore } from '@/store/libraryStore';
import { useTranslation } from '@/hooks/useTranslation';
import { navigateToLibrary, navigateToReader } from '@/utils/nav';

import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import BookshelfItem, { generateBookshelfItems } from './BookshelfItem';
import { isMd5 } from '@/utils/md5';
import GroupingModal from './GroupingModal';

interface BookshelfProps {
  libraryBooks: Book[];
  isSelectMode: boolean;
  handleImportBooks: () => void;
  handleBookUpload: (book: Book) => void;
  handleBookDownload: (book: Book) => void;
  handleBookDelete: (book: Book) => void;
  handleSetSelectMode: (selectMode: boolean) => void;
  handleShowDetailsBook: (book: Book) => void;
  handleToggleSelectMode: () => void;
  booksTransferProgress: { [key: string]: number | null };
}

const Bookshelf: React.FC<BookshelfProps> = ({
  libraryBooks,
  isSelectMode,
  handleImportBooks,
  handleBookUpload,
  handleBookDownload,
  handleBookDelete,
  handleSetSelectMode,
  handleShowDetailsBook,
  handleToggleSelectMode,
  booksTransferProgress,
}) => {
  const _ = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appService } = useEnv();
  const [loading, setLoading] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showGroupingModal, setShowGroupingModal] = useState(false);
  const [navBooksGroup, setNavBooksGroup] = useState<BooksGroup | null>(null);
  const [importBookUrl] = useState(searchParams?.get('url') || '');
  const isImportingBook = useRef(false);

  const { setLibrary } = useLibraryStore();
  const allBookshelfItems = generateBookshelfItems(libraryBooks);

  useEffect(() => {
    setSelectedBooks([]);
  }, [isSelectMode]);

  useEffect(() => {
    if (isImportingBook.current) return;
    isImportingBook.current = true;

    if (importBookUrl && appService) {
      const importBook = async () => {
        console.log('Importing book from URL:', importBookUrl);
        const book = await appService.importBook(importBookUrl, libraryBooks);
        if (book) {
          setLibrary(libraryBooks);
          appService.saveLibraryBooks(libraryBooks);
          navigateToReader(router, [book.hash]);
        }
      };
      importBook();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importBookUrl, appService]);

  useEffect(() => {
    const group = searchParams?.get('group') || '';
    if (group) {
      const booksGroup = allBookshelfItems.find(
        (item) => 'name' in item && item.id === group,
      ) as BooksGroup;
      if (booksGroup) {
        setNavBooksGroup(booksGroup);
      } else {
        navigateToLibrary(router);
      }
    } else {
      setNavBooksGroup(null);
      navigateToLibrary(router);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, showGroupingModal]);

  const toggleSelection = (id: string) => {
    setSelectedBooks((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id],
    );
  };

  const openSelectedBooks = () => {
    setTimeout(() => setLoading(true), 200);
    navigateToReader(router, selectedBooks);
  };

  const confirmDelete = async () => {
    for (const id of selectedBooks) {
      const book = libraryBooks.find((b) => b.hash === id || b.groupId === id);
      if (book) {
        await handleBookDelete(book);
      }
    }
    setSelectedBooks([]);
    setShowDeleteAlert(false);
  };

  const deleteSelectedBooks = () => {
    setShowDeleteAlert(true);
  };

  const groupSelectedBooks = () => {
    setShowGroupingModal(true);
  };

  const currentBookshelfItems = navBooksGroup ? navBooksGroup.books : allBookshelfItems;

  return (
    <div className='bookshelf'>
      <div className='grid flex-1 grid-cols-3 gap-0 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'>
        {currentBookshelfItems.map((item, index) => (
          <BookshelfItem
            key={`library-item-${index}`}
            item={item}
            isSelectMode={isSelectMode}
            selectedBooks={selectedBooks}
            setLoading={setLoading}
            toggleSelection={toggleSelection}
            handleBookUpload={handleBookUpload}
            handleBookDownload={handleBookDownload}
            handleBookDelete={handleBookDelete}
            handleSetSelectMode={handleSetSelectMode}
            handleShowDetailsBook={handleShowDetailsBook}
            transferProgress={
              'hash' in item ? booksTransferProgress[(item as Book).hash] || null : null
            }
          />
        ))}
        {!navBooksGroup && allBookshelfItems.length > 0 && (
          <div
            className='border-1 bg-base-100 hover:bg-base-300/50 m-4 flex aspect-[28/41] items-center justify-center'
            role='button'
            onClick={handleImportBooks}
          >
            <PiPlus className='size-10' color='gray' />
          </div>
        )}
      </div>
      {loading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <Spinner loading />
        </div>
      )}
      <div className={clsx('action-bar-bottom z-[99] pb-[calc(env(safe-area-inset-bottom)+16px)]')}>
        {isSelectMode && (
          <div
            className={clsx(
              'text-base-content bg-base-300 mx-auto flex w-fit items-center justify-center',
              'space-x-6 rounded-lg p-4 shadow-lg',
            )}
          >
            <button
              onClick={openSelectedBooks}
              className={clsx(
                'flex flex-col items-center justify-center',
                (!selectedBooks.length || !selectedBooks.every((id) => isMd5(id))) &&
                  'btn-disabled opacity-50',
              )}
            >
              <MdOpenInNew />
              <div>{_('Open')}</div>
            </button>
            <button
              onClick={groupSelectedBooks}
              className={clsx(
                'flex flex-col items-center justify-center',
                !selectedBooks.length && 'btn-disabled opacity-50',
              )}
            >
              <MdOutlineCreateNewFolder />
              <div>{_('Add to Group')}</div>
            </button>
            <button
              onClick={deleteSelectedBooks}
              className={clsx(
                'flex flex-col items-center justify-center',
                !selectedBooks.length && 'btn-disabled opacity-50',
              )}
            >
              <MdDelete className='fill-red-500' />
              <div className='text-red-500'>{_('Delete')}</div>
            </button>
            <button
              onClick={() => handleToggleSelectMode()}
              className={clsx('flex flex-col items-center justify-center')}
            >
              <MdOutlineCancel />
              <div>{_('Cancel')}</div>
            </button>
          </div>
        )}
      </div>
      {showGroupingModal && (
        <div>
          <GroupingModal
            libraryBooks={libraryBooks}
            selectedBooks={selectedBooks}
            onConfirm={() => {
              setSelectedBooks([]);
              setShowGroupingModal(false);
            }}
            onCancel={() => setShowGroupingModal(false)}
          />
        </div>
      )}
      {showDeleteAlert && (
        <div
          className={clsx(
            'action-bar-bottom z-[100] flex justify-center',
            'pb-[calc(env(safe-area-inset-bottom)+16px)]',
          )}
        >
          <Alert
            title={_('Confirm Deletion')}
            message={_('Are you sure to delete the selected books?')}
            onClickCancel={() => setShowDeleteAlert(false)}
            onClickConfirm={confirmDelete}
          />
        </div>
      )}
    </div>
  );
};

export default Bookshelf;
