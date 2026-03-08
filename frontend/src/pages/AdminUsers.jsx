import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAdminUsersApi, updateAdminUserApi } from "@/api/adminApi";

const AdminUsers = () => {
  const currentUser = useSelector((state) => state.user.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [drafts, setDrafts] = useState({});

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminUsersApi();
      const list = res.data.data || [];
      setUsers(list);
      const nextDrafts = {};
      list.forEach((user) => {
        nextDrafts[user._id] = {
          role: user.role,
          isVerified: Boolean(user.isVerified),
        };
      });
      setDrafts(nextDrafts);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      loadUsers();
    }
  }, [currentUser, loadUsers]);

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-sm text-slate-600">
          You are not authorized to view this page.
        </p>
      </div>
    );
  }

  const handleDraftChange = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = async (user) => {
    const draft = drafts[user._id];
    if (!draft) return;

    const changed =
      draft.role !== user.role ||
      Boolean(draft.isVerified) !== Boolean(user.isVerified);

    if (!changed) {
      toast.info("No changes to save");
      return;
    }

    try {
      setSavingId(user._id);
      await updateAdminUserApi(user._id, {
        role: draft.role,
        isVerified: draft.isVerified,
      });
      toast.success("User updated successfully");
      await loadUsers();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update user");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-amber-50">
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-6">
          User Management
        </h1>
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-x-auto">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No users found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-amber-100/70">
                <tr className="text-left text-slate-700">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {users.map((user) => {
                  const draft = drafts[user._id] || {
                    role: user.role,
                    isVerified: Boolean(user.isVerified),
                  };

                  return (
                    <tr key={user._id} className="hover:bg-amber-50/60">
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={draft.role}
                          onChange={(e) =>
                            handleDraftChange(user._id, "role", e.target.value)
                          }
                          className="border border-amber-300 rounded px-2 py-1 bg-white"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(draft.isVerified)}
                            onChange={(e) =>
                              handleDraftChange(
                                user._id,
                                "isVerified",
                                e.target.checked
                              )
                            }
                          />
                          <span>{draft.isVerified ? "Yes" : "No"}</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {user.isLoggedIn ? "Online" : "Offline"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          onClick={() => handleSave(user)}
                          disabled={savingId === user._id}
                          className="bg-slate-900 text-white hover:bg-slate-800"
                        >
                          {savingId === user._id ? "Saving..." : "Save"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
