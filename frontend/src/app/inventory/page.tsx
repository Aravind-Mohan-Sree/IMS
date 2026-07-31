'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavLayout } from '../../components/NavLayout';
import { ExportToolbar } from '../../components/ExportToolbar';
import { ItemModal, ItemData } from '../../components/ItemModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useRouter } from 'next/navigation';
import {
  FiPackage,
  FiSearch,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiAlertCircle,
  FiFilter,
  FiCheckCircle,
  FiLoader,
  FiX
} from 'react-icons/fi';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { CategoryModal } from '../../components/CategoryModal';
import api from '../../lib/api';
import { toast } from 'react-toastify';

export default function InventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<ItemData[]>([]);
  const [allItemsForExport, setAllItemsForExport] = useState<ItemData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [totalCategoryCount, setTotalCategoryCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemData | null>(null);

  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchCategoryOptions = useCallback(async (search: string, pageNum: number) => {
    const params = new URLSearchParams({
      page: String(pageNum),
      limit: '15',
      search
    });
    const res = await api.get(`/categories?${params.toString()}`);
    const cats = res.data.categories || (Array.isArray(res.data) ? res.data : []);
    if (typeof res.data?.total === 'number') {
      setTotalCategoryCount(res.data.total);
    } else if (Array.isArray(cats)) {
      setTotalCategoryCount(cats.length);
    }

    const options = cats.map((c: any) => ({
      label: c.name,
      value: c.name,
      raw: c
    }));

    if (pageNum === 1 && !search.trim()) {
      options.unshift({ label: 'All Categories', value: 'All Categories' });
    }

    return {
      options,
      hasMore: res.data.hasMore || false
    };
  }, []);

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await api.delete(`/categories/${categoryToDelete.id}`);
      toast.success(`Category "${categoryToDelete.name}" deleted successfully`);
      setCategoryToDelete(null);
      if (selectedCategory === categoryToDelete.name) {
        setSelectedCategory('All');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  // Delete confirmation modal state
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  // 300ms Debounce effect on item search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch initial batch and export dataset
  const fetchItems = useCallback(async (pageNum: number = 1, isAppend: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams();
      params.append('page', String(pageNum));
      params.append('limit', '15');
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedCategory && selectedCategory !== 'All Categories' && selectedCategory !== 'All') params.append('category', selectedCategory);

      const res = await api.get(`/items?${params.toString()}`);

      if (res.data && res.data.items) {
        if (isAppend) {
          setItems(prev => [...prev, ...res.data.items]);
        } else {
          setItems(res.data.items);
        }
        setHasMore(res.data.hasMore);
        if (typeof res.data.total === 'number') {
          setTotalItemsCount(res.data.total);
        }
      } else if (Array.isArray(res.data)) {
        setItems(res.data);
        setHasMore(false);
        setTotalItemsCount(res.data.length);
      }
    } catch (_err) {
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, selectedCategory]);

  // Fetch all items for export toolbar
  const fetchExportData = useCallback(async () => {
    try {
      const res = await api.get('/items?all=true');
      setAllItemsForExport(Array.isArray(res.data) ? res.data : res.data.items || []);
    } catch (_err) {
      console.error('Failed to load export data');
    }
  }, []);

  // Fetch total category count on page load
  const fetchCategoryCount = useCallback(async () => {
    try {
      const res = await api.get('/categories?page=1&limit=1');
      if (typeof res.data?.total === 'number') {
        setTotalCategoryCount(res.data.total);
      } else if (Array.isArray(res.data)) {
        setTotalCategoryCount(res.data.length);
      }
    } catch (_err) {
      console.error('Failed to load category count');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Reset pagination when search or category filter changes
  useEffect(() => {
    if (user) {
      setPage(1);
      fetchItems(1, false);
      fetchExportData();
      fetchCategoryCount();
    }
  }, [user, debouncedSearch, selectedCategory, fetchItems, fetchExportData, fetchCategoryCount]);

  const loadNextPage = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchItems(nextPage, true);
    }
  }, [hasMore, loading, loadingMore, page, fetchItems]);

  const sentinelRef = useInfiniteScroll({
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: loadNextPage
  });

  const handleCreateNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ItemData) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/items/${itemToDelete.id}`);
      toast.success(`"${itemToDelete.name}" deleted successfully`);
      setItemToDelete(null);
      setPage(1);
      fetchItems(1, false);
      fetchExportData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete item');
    }
  };

  if (authLoading || !user) return null;

  const exportHeaders = [
    { header: 'SKU', key: 'sku' },
    { header: 'Item Name', key: 'name' },
    { header: 'Description', key: 'description' },
    { header: 'Category', key: 'category' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Unit Price (₹)', key: 'price' }
  ];

  return (
    <NavLayout>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5 flex-wrap">
            <FiPackage className="text-teal-400 shrink-0" /> Inventory Management
            <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-400 border border-teal-500/30 font-semibold rounded-full text-xs sm:text-sm">
              {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'}
            </span>
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-semibold rounded-full text-xs sm:text-sm">
              {totalCategoryCount} {totalCategoryCount === 1 ? 'Category' : 'Categories'}
            </span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            View, search, add, update, and manage inventory items and stock levels.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-teal-600/30 shrink-0 w-full sm:w-auto"
        >
          <FiPlus className="w-4 h-4" /> Add New Item
        </button>
      </div>

      {/* Export Toolbar */}
      <ExportToolbar
        reportType="items"
        dataForExport={allItemsForExport.length > 0 ? allItemsForExport : items}
        headersForExport={exportHeaders}
      />

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-lg">
        <div className="sm:col-span-2 relative">
          <FiSearch className="absolute left-3.5 top-3.5 text-slate-500 w-4 h-4" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search items by Name or Description..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-teal-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-800 transition-colors"
              title="Clear search"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>
          <SearchableSelect
            value={selectedCategory}
            onChange={val => setSelectedCategory(val)}
            fetchOptions={fetchCategoryOptions}
            placeholder="All Categories"
            searchPlaceholder="Search category..."
            clearable={false}
            onAddNew={() => {
              setEditingCategory(null);
              setIsCategoryModalOpen(true);
            }}
            addNewLabel="Add New Category"
            onEditOption={opt => {
              if (opt.raw) {
                setEditingCategory({
                  id: opt.raw._id || opt.raw.id,
                  name: opt.raw.name,
                  description: opt.raw.description
                });
                setIsCategoryModalOpen(true);
              }
            }}
            onDeleteOption={opt => {
              if (opt.raw) {
                setCategoryToDelete({
                  id: opt.raw._id || opt.raw.id,
                  name: opt.raw.name
                });
              }
            }}
          />
        </div>
      </div>

      {/* Items Table Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm px-4">
            No items match your search filter or inventory is empty.
          </div>
        ) : (
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[700px]">
              <thead className="sticky top-0 z-10 bg-slate-950 text-xs font-semibold text-slate-400 uppercase tracking-wider shadow-sm">
                <tr>
                  <th className="px-4 sm:px-5 py-3.5">Item Details</th>
                  <th className="px-4 sm:px-5 py-3.5">Category</th>
                  <th className="px-4 sm:px-5 py-3.5 text-right">Selling Price</th>
                  <th className="px-4 sm:px-5 py-3.5 text-right">Cost Price</th>
                  <th className="px-4 sm:px-5 py-3.5 text-center">Stock Quantity</th>
                  <th className="px-4 sm:px-5 py-3.5 text-center">Status</th>
                  <th className="px-4 sm:px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map(item => {
                  const isLowStock = item.quantity <= item.minStockLevel;
                  const isOutOfStock = item.quantity === 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 sm:px-5 py-3.5">
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-teal-400/80">{item.sku}</span>
                          {item.description && <span className="truncate max-w-[200px] sm:max-w-xs">• {item.description}</span>}
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                        <span
                          className="inline-block max-w-[140px] sm:max-w-[180px] truncate px-2.5 py-1 text-[11px] font-medium bg-slate-800 text-slate-300 rounded-lg border border-slate-700 align-middle"
                          title={item.category}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 text-right font-bold text-emerald-400 whitespace-nowrap">
                        ₹{Number(item.price).toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 text-right text-slate-400 whitespace-nowrap">
                        ₹{item.costPrice ? Number(item.costPrice).toFixed(2) : '-'}
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 text-center font-bold text-white whitespace-nowrap">
                        {item.quantity} <span className="text-[11px] text-slate-400 font-normal">{item.unit}</span>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 text-center whitespace-nowrap">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full whitespace-nowrap shrink-0">
                            <FiAlertCircle className="w-3 h-3 shrink-0" /> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full whitespace-nowrap shrink-0">
                            <FiAlertCircle className="w-3 h-3 shrink-0" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full whitespace-nowrap shrink-0">
                            <FiCheckCircle className="w-3 h-3 shrink-0" /> In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 sm:p-2 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit item"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setItemToDelete({ id: item.id!, name: item.name })}
                            className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete item"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Infinite Scroll Trigger Sentinel & Loading Spinner */}
            <div ref={sentinelRef} className="py-4 text-center">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-teal-400">
                  <FiLoader className="w-4 h-4 animate-spin" /> Loading more inventory items...
                </div>
              )}
              {!hasMore && items.length > 0 && (
                <div className="text-[11px] text-slate-500">All inventory items loaded</div>
              )}
            </div>
          </div>
        )}
      </div>

      <ItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setPage(1);
          fetchItems(1, false);
          fetchExportData();
        }}
        initialItem={editingItem}
      />

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Inventory Item"
        message={`Are you sure you want to delete "${itemToDelete?.name}" from inventory? This action cannot be undone.`}
        confirmText="Delete Item"
        onConfirm={confirmDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />
      <CategoryModal
        isOpen={isCategoryModalOpen}
        initialCategory={editingCategory}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSuccess={(_newCatName, _isEdit) => {
          setEditingCategory(null);
        }}
      />
      <ConfirmModal
        isOpen={!!categoryToDelete}
        title="Delete Category"
        message={`Are you sure you want to delete category "${categoryToDelete?.name}"? Items using this category will remain unaffected.`}
        confirmText="Delete Category"
        onConfirm={confirmDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />
    </NavLayout>
  );
}
