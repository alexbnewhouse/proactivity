import express from 'express';
import database from '../database/database.js';
const router = express.Router();

/**
 * Push data from client to server for sync
 */
router.post('/push', async (req, res) => {
  try {
    const { source, tasks = [], energyLevel, timestamp } = req.body;
    
    if (!source) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Source is required (obsidian or extension)'
      });
    }

    const results = {
      synced: 0,
      conflicts: [],
      errors: []
    };

    // Process tasks
    for (const task of tasks) {
      try {
        const db = database.getDb();
        // Check if task exists
        const existingTask = await db.get(
          'SELECT * FROM tasks WHERE id = ?',
          [task.id]
        );

        if (existingTask) {
          // Update existing task (conflict resolution: latest wins)
          const existingTime = new Date(existingTask.updated_at || existingTask.created_at);
          const newTime = new Date(task.updatedAt || task.createdAt);
          
          if (newTime >= existingTime) {
            await db.run(`
              UPDATE tasks SET 
                title = ?, description = ?, status = ?, priority = ?,
                estimated_minutes = ?, actual_minutes = ?, updated_at = ?,
                source = ?, sync_status = 'synced'
              WHERE id = ?
            `, [
              task.title, task.description, task.completed ? 'completed' : 'pending', task.priority,
              task.estimatedMinutes, task.actualMinutes || 0, task.updatedAt || new Date().toISOString(),
              source, task.id
            ]);
            results.synced++;
          } else {
            results.conflicts.push({
              taskId: task.id,
              reason: 'Server version is newer',
              resolution: 'server_wins'
            });
          }
        } else {
          // Insert new task
          await db.run(`
            INSERT INTO tasks (id, title, description, status, priority, estimated_minutes, actual_minutes, created_at, updated_at, source, sync_status, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 1)
          `, [
            task.id, task.title, task.description, task.completed ? 'completed' : 'pending', task.priority,
            task.estimatedMinutes || 30, task.actualMinutes || 0,
            task.createdAt, task.updatedAt || task.createdAt, source
          ]);
          results.synced++;
        }
      } catch (error) {
        results.errors.push({
          taskId: task.id,
          error: error.message
        });
      }
    }

    // Update sync metadata
    const db = database.getDb();
    await db.run(`
      INSERT OR REPLACE INTO sync_metadata (source, last_sync, sync_count)
      VALUES (?, ?, COALESCE((SELECT sync_count FROM sync_metadata WHERE source = ?) + 1, 1))
    `, [source, new Date().toISOString(), source]);

    res.json({
      success: true,
      message: 'Data pushed successfully',
      data: results
    });

  } catch (error) {
    console.error('Sync push error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to push sync data'
    });
  }
});

/**
 * Pull latest data from server for sync
 */
router.get('/pull', async (req, res) => {
  try {
    const { source, since } = req.query;
    let whereClause = '';
    let params = [];
    if (since) {
      whereClause = 'WHERE updated_at > ?';
      params.push(since);
    }
    if (source) {
      whereClause += whereClause ? ' AND source != ?' : 'WHERE source != ?';
      params.push(source);
    }
    const query = `SELECT id, title, description, status, priority, estimated_minutes, actual_minutes, created_at, updated_at, source, sync_status FROM tasks ${whereClause} ORDER BY updated_at DESC LIMIT 100`;
    console.log('Sync pull query:', query, params);
  const db = database.getDb();
  const tasks = await db.all(query, params);
    const clientTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.status === 'completed',
      priority: task.priority,
      estimatedMinutes: task.estimated_minutes,
      actualMinutes: task.actual_minutes,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      source: task.source,
      syncStatus: task.sync_status
    }));
    res.json({
      success: true,
      data: clientTasks,
      metadata: {
        count: clientTasks.length,
        since: since || null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Sync pull error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to pull sync data',
      details: error.message,
      stack: error.stack
    });
  }
});

/**
 * Get sync status and metadata
 */
router.get('/status', async (req, res) => {
  try {
    const { source } = req.query;
    const syncMetaQuery = `SELECT source, last_sync, sync_count FROM sync_metadata ${source ? 'WHERE source = ?' : ''} ORDER BY last_sync DESC`;
    console.log('Sync status query:', syncMetaQuery, source ? [source] : []);
    const db = database.getDb();
    const syncMeta = await db.all(syncMetaQuery, source ? [source] : []);
    const taskCountsQuery = `SELECT source, COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed, MAX(updated_at) as last_updated FROM tasks GROUP BY source`;
    console.log('Sync status taskCounts query:', taskCountsQuery);
    const taskCounts = await db.all(taskCountsQuery);
    res.json({
      success: true,
      data: {
        syncMetadata: syncMeta,
        taskCounts: taskCounts,
        serverTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get sync status',
      details: error.message,
      stack: error.stack
    });
  }
});

/**
 * Clear sync data (for testing/reset)
 */
router.delete('/clear', async (req, res) => {
  try {
    const { source, confirm } = req.body;
    
    if (confirm !== 'CLEAR_SYNC_DATA') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Must provide confirm: "CLEAR_SYNC_DATA" to clear sync data'
      });
    }

    if (source) {
          const db = database.getDb();
          await db.run('DELETE FROM tasks WHERE source = ?', [source]);
          await db.run('DELETE FROM sync_metadata WHERE source = ?', [source]);
    } else {
          const db = database.getDb();
          await db.run('DELETE FROM tasks');
          await db.run('DELETE FROM sync_metadata');
    }

    res.json({
      success: true,
      message: source ? `Cleared sync data for ${source}` : 'Cleared all sync data'
    });

  } catch (error) {
    console.error('Sync clear error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to clear sync data'
    });
  }
});

export default router;