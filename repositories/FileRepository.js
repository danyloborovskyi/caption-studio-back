/**
 * File Repository
 * Handles all database operations for files
 * Abstracts Supabase specifics from business logic
 */

const File = require("../models/File");
const { getSupabaseClient } = require("../config/supabase");

class FileRepository {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Create a new file record
   */
  async create(fileData) {
    const { data, error } = await this.supabase
      .from("uploaded_files")
      .insert([fileData])
      .select()
      .single();

    if (error) throw error;
    return new File(data);
  }

  /**
   * Find file by ID
   */
  async findById(id, userId) {
    const { data, error } = await this.supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data ? new File(data) : null;
  }

  /**
   * Find all files for a user
   */
  async findByUserId(userId, options = {}) {
    let query = this.supabase
      .from("uploaded_files")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    // Apply filters
    if (options.status) {
      query = query.eq("status", options.status);
    }

    // Apply sorting
    const sortBy = options.sortBy || "uploaded_at";
    const sortOrder = options.sortOrder || "desc";
    const ascending = sortOrder.toLowerCase() === "asc";
    query = query.order(sortBy, { ascending });

    // Apply pagination
    if (options.page && options.perPage) {
      const offset = (options.page - 1) * options.perPage;
      query = query.range(offset, offset + options.perPage - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      files: (data || []).map((file) => new File(file)),
      total: count,
    };
  }

  /**
   * Update a file
   */
  async update(id, userId, updates) {
    const { data, error } = await this.supabase
      .from("uploaded_files")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return new File(data);
  }

  /**
   * Delete a file
   */
  async delete(id, userId) {
    const { error } = await this.supabase
      .from("uploaded_files")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  }

  /**
   * Bulk delete files
   */
  async bulkDelete(ids, userId) {
    const { error } = await this.supabase
      .from("uploaded_files")
      .delete()
      .in("id", ids)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  }

  /**
   * Search files
   */
  async search(userId, searchQuery, options = {}) {
    const { data, error } = await this.supabase
      .from("uploaded_files")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    // Client-side filtering (could be optimized with full-text search in production)
    const filteredData = (data || []).filter((file) => {
      const filenameMatch = file.filename
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const descriptionMatch = file.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const tagsMatch = file.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return filenameMatch || descriptionMatch || tagsMatch;
    });

    return filteredData.map((file) => new File(file));
  }
}

module.exports = FileRepository;
