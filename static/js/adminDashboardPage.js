document.addEventListener('DOMContentLoaded', function () {
    const adminApiBase = window.APP_CONFIG.adminApiBaseUrl;
    const API_GET_CONTENT_TREE_URL = window.APP_CONFIG.apiGetContentTreeUrl;

    const tabsConfig = {
        approved: {
            body: document.getElementById('approved-table-body'),
            currentPage: 1, isLoading: false, isEnd: false, data: []
        },
        pending: {
            body: document.getElementById('pending-table-body'),
            currentPage: 1, isLoading: false, isEnd: false, data: []
        },
        private: {
            body: document.getElementById('private-table-body'),
            currentPage: 1, isLoading: false, isEnd: false, data: []
        }
    };
    let activeStatus = 'approved'; 

    // 长分享码模态框
    const viewShareCodeModal = new bootstrap.Modal(document.getElementById('viewShareCodeModal'));
    const modalCodeHashDisplaySpan = document.getElementById('modalCodeHashDisplay'); 
    const modalShareCodeTextarea = document.getElementById('modalShareCodeContent');
    const copyModalShareCodeBtn = document.getElementById('copyModalShareCode');
    const originalCopyModalBtnHtml = copyModalShareCodeBtn.innerHTML;

    // 目录树模态框元素
    const contentTreeModalEl = document.getElementById('contentTreeModal'); 
    const contentTreeSearchInput = document.getElementById('contentTreeSearchInputAdmin'); 
    const contentTreeDisplayArea = document.getElementById('contentTreeDisplayAreaAdmin'); 
    const bsContentTreeModal = contentTreeModalEl ? new bootstrap.Modal(contentTreeModalEl) : null;

    // 新增：更新数据库按钮
    const updateDatabaseBtn = document.getElementById('updateDatabaseBtn');

    async function fetchAdminApi(endpoint, method = 'GET', body = null) {
        const options = {
            method: method,
            headers: {},
        };
        if (method !== 'GET' && body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        try {
            const response = await fetch(`${adminApiBase}${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                // 对于管理员API调用，直接用 alert 提示错误
                window.alert(`API操作失败 (${response.status}): ${errorData.message}`);
                throw new Error(`API请求失败 (${response.status}): ${errorData.message}`);
            }
            return await response.json(); 
        } catch (error) {
            console.error(`请求 ${adminApiBase}${endpoint} 失败:`, error);
            // 如果 fetch 本身失败（如网络问题），错误可能不是 Error 实例，确保消息存在
            // 对于已通过上面 if (!response.ok) 检查的错误，这里不再重复 alert
            if (!(error instanceof Error && error.message.startsWith('API请求失败'))) {
                 window.alert(`网络或请求错误: ${error.message || '未知错误'}`);
            }
            throw error; 
        }
    }

    async function loadSharesForTab(status, page, append = false) {
        const tab = tabsConfig[status]; 
        if (tab.isLoading || (append && tab.isEnd)) {
            return;
        }
        tab.isLoading = true; 

        if (page === 1 && !append) {
            tab.body.innerHTML = `<tr><td colspan="6" class="text-center text-muted">正在加载...</td></tr>`;
            tab.data = [];
            tab.isEnd = false;
        } else if (append) {
            const loadingRow = tab.body.insertRow(-1);
            loadingRow.classList.add('loading-indicator-row');
            loadingRow.innerHTML = `<td colspan="6" class="text-center text-muted">正在加载更多...</td>`;
        }

        try {
            const data = await fetchAdminApi(`/get_shares?status=${status}&page=${page}`, 'GET');
            const existingLoadingIndicator = tab.body.querySelector('.loading-indicator-row');
            if (existingLoadingIndicator) existingLoadingIndicator.remove();
            
            if (data.success) {
                if (page === 1 && !append) tab.body.innerHTML = ''; 
                if (data.shares && data.shares.length > 0) {
                    tab.data = append ? tab.data.concat(data.shares) : data.shares;
                    populateTable(tab.body, data.shares, append); 
                    tab.currentPage = page;
                } else if (page === 1 && !append) {
                    tab.body.innerHTML = `<tr><td colspan="6" class="text-center text-muted">暂无记录</td></tr>`;
                }
                tab.isEnd = data.end; 
            } else {
                // fetchAdminApi 应该已经 alert 了错误信息，这里仅更新表格内容
                if (page === 1 && !append) tab.body.innerHTML = `<tr><td colspan="6" class="text-center text-danger">加载失败: ${escapeHtml(data.message)}</td></tr>`;
                else if (append) tab.body.insertAdjacentHTML('beforeend', `<tr><td colspan="6" class="text-center text-danger">加载更多失败</td></tr>`);
                tab.isEnd = true; 
            }
        } catch (error) { 
            // fetchAdminApi 已经处理了 alert, 这里主要处理UI回退
            if (page === 1 && !append) tab.body.innerHTML = `<tr><td colspan="6" class="text-center text-danger">加载时出现错误</td></tr>`;
            else if (append && tab.body.lastChild && tab.body.lastChild.classList.contains('loading-indicator-row')) {
                tab.body.lastChild.innerHTML = `<td colspan="6" class="text-center text-danger">加载更多错误</td>`;
            }
            tab.isEnd = true; 
        } finally {
            tab.isLoading = false; 
        }
    }

    function populateTable(tbody, sharesPage, append = false) {
        if (!append) { 
            tbody.innerHTML = ''; 
        }
        if (append && sharesPage.length === 0) return;
        if (tbody.children.length === 0 && sharesPage.length === 0 && !append) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">暂无记录</td></tr>`;
            return;
        }

        sharesPage.forEach(share => {
            const row = tbody.insertRow(); 
            row.dataset.codeHash = share.codeHash; 

            let statusBadge = ''; 
            if (share.visibleFlag === true) {
                statusBadge = '<span class="badge bg-success status-badge">已审核</span>';
            } else if (share.visibleFlag === null) { 
                statusBadge = '<span class="badge bg-warning text-dark status-badge">待审核</span>';
            } else if (share.visibleFlag === false) {
                statusBadge = '<span class="badge bg-secondary status-badge">私密</span>';
            }

            // 注意：确保所有动态插入的字符串都经过 escapeHtml 处理
            row.innerHTML = `
                <td class="codehash-cell">${escapeHtml(share.codeHash)}</td>
                <td class="root-folder-name-cell">${escapeHtml(share.rootFolderName)}</td>
                <td class="share-code-cell">
                    <span class="view-full-code" 
                          data-codehash="${escapeHtml(share.codeHash)}" 
                          data-sharecode="${escapeHtml(share.shareCode)}">
                        ${escapeHtml(share.shareCode.substring(0,10))}... (点击查看)
                    </span>
                </td>
                <td>${new Date(share.timeStamp).toLocaleString('zh-CN')}</td>
                <td>${statusBadge}</td>
                <td class="action-buttons">
                    ${generateActionButtons(share.codeHash, share.visibleFlag, share.rootFolderName, share.shareCode)}
                </td>
            `;
        });
    }
    
    function generateActionButtons(codeHash, visibleFlag, currentName, shareCode) {
        let buttons = `<button class="btn btn-outline-info btn-sm edit-name-btn" data-currentname="${escapeHtml(currentName)}">编辑名称</button>`;
        if (visibleFlag === null) { 
            buttons += `<button class="btn btn-success btn-sm update-status-btn" data-newstatus="approved">审核通过</button>`;
            buttons += `<button class="btn btn-secondary btn-sm update-status-btn" data-newstatus="private">转私密</button>`;
        } else if (visibleFlag === true) { 
            buttons += `<button class="btn btn-warning btn-sm update-status-btn" data-newstatus="pending">设为待审</button>`;
            buttons += `<button class="btn btn-secondary btn-sm update-status-btn" data-newstatus="private">转私密</button>`;
        } else if (visibleFlag === false) { 
            buttons += `<button class="btn btn-info btn-sm update-status-btn" data-newstatus="pending">设为待审</button>`;
        }
        buttons += `<button class="btn btn-outline-secondary btn-sm view-share-content-tree-btn" data-codehash="${escapeHtml(codeHash)}" data-sharecode="${escapeHtml(shareCode)}" title="查看目录结构"><i class="bi bi-folder2-open"></i></button>`;
        buttons += `<button class="btn btn-danger btn-sm delete-share-btn" title="删除"><i class="bi bi-trash"></i></button>`;
        return buttons;
    }

    document.body.addEventListener('click', async function(event) {
        const target = event.target.closest('button, span.view-full-code'); 
        if (!target) return;
        
        if (target.classList.contains('view-full-code')) {
            const codeHash = target.dataset.codehash;
            const shareCode = target.dataset.sharecode;
            modalCodeHashDisplaySpan.textContent = codeHash; 
            modalShareCodeTextarea.value = shareCode; 
            viewShareCodeModal.show(); 
            return; 
        }

        const row = target.closest('tr'); 
        if (!row) return; 

        const codeHashFromRow = row.dataset.codeHash; 

        if (target.classList.contains('edit-name-btn')) {
            const nameCell = row.querySelector('.root-folder-name-cell');
            const currentName = target.dataset.currentname;
            // 使用 escapeHtml 确保 currentName 中的特殊字符被正确处理
            nameCell.innerHTML = `
                <div class="input-group input-group-sm edit-input-group">
                    <input type="text" class="form-control form-control-sm" value="${escapeHtml(currentName)}">
                    <button class="btn btn-success btn-sm save-name-btn">确认</button>
                    <button class="btn btn-secondary btn-sm cancel-edit-btn" data-original="${escapeHtml(currentName)}">取消</button>
                </div>`;
            
            row.querySelectorAll('.action-buttons .btn').forEach(btn => {
                if (!btn.classList.contains('save-name-btn') && !btn.classList.contains('cancel-edit-btn')) {
                    btn.style.display = 'none';
                }
            });
            target.style.display = 'none';

        } else if (target.classList.contains('save-name-btn')) {
            const inputField = row.querySelector('.root-folder-name-cell input[type="text"]');
            const newName = inputField.value;
            await updateShareName(codeHashFromRow, newName, row); 
        } else if (target.classList.contains('cancel-edit-btn')) {
            // 如果是取消编辑，重新加载当前tab的第一页数据以恢复所有行
            const currentTabConfig = tabsConfig[activeStatus];
            // tabConfig.currentPage = 1; // 不再强制重置到第一页，而是刷新当前页或第一页
            // tabConfig.isEnd = false;
            // tabConfig.data = [];
            loadSharesForTab(activeStatus, 1, false); // 简单起见，总是重新加载第一页
        } else if (target.classList.contains('update-status-btn')) {
            const newStatus = target.dataset.newstatus;
            await updateShareStatus(codeHashFromRow, newStatus); 
        } else if (target.classList.contains('delete-share-btn')) {
            await deleteShareConfirmation(codeHashFromRow); 
        } else if (target.classList.contains('view-share-content-tree-btn')) { 
            const codeHash = target.dataset.codehash;
            const shareCode = target.dataset.sharecode; 
            if (bsContentTreeModal) { 
                fetchAndDisplayContentTree({ codeHash, shareCode }); 
            } else {
                console.error("目录树模态框未初始化！");
            }
        }
    });
        
    async function updateShareName(codeHash, newName, rowElement) {
        if (!newName.trim()) {
            alert("分享名称不能为空。");
            return;
        }
        if (!confirm(`确定要将短码 ${escapeHtml(codeHash.substring(0,8))}... 的名称修改为 "${escapeHtml(newName)}" 吗？`)) {
            return;
        }
        try {
            const data = await fetchAdminApi('/update_share_name', 'POST', { codeHash, newName });
            if (data.success) {
                // alert(data.message); 在 fetchAdminApi 中处理
                // 重新加载当前标签页的第一页数据
                tabsConfig[activeStatus].currentPage = 1;
                tabsConfig[activeStatus].isEnd = false;
                tabsConfig[activeStatus].data = [];
                loadSharesForTab(activeStatus, 1, false);
            } // else fetchAdminApi 已经 alert
        } catch (error) { /* 错误已由 fetchAdminApi 处理 */ }
    }

    async function updateShareStatus(codeHash, newStatus) {
        const statusTextMap = { approved: "审核通过", pending: "设为待审核", private: "转为私密" };
        if (!confirm(`确定要将短码 ${escapeHtml(codeHash.substring(0,8))}... 的状态改为 "${statusTextMap[newStatus]}" 吗？`)) {
            return;
        }
        try {
            const data = await fetchAdminApi('/update_share_status', 'POST', { codeHash, newStatus });
            if (data.success) {
                 // alert(data.message); 在 fetchAdminApi 中处理
                // 重新加载所有标签页的数据，因为状态改变可能导致条目在标签页间移动
                Object.keys(tabsConfig).forEach(statusKey => {
                    tabsConfig[statusKey].currentPage = 1;
                    tabsConfig[statusKey].isEnd = false;
                    tabsConfig[statusKey].data = [];
                    // 仅重新加载当前激活的标签页，或者全部重新加载并在切换时生效
                    if (statusKey === activeStatus) {
                        loadSharesForTab(statusKey, 1, false);
                    }
                });
            }  // else fetchAdminApi 已经 alert
        } catch (error) { /* 错误已由 fetchAdminApi 处理 */ }
    }

    async function deleteShareConfirmation(codeHash) {
        if (!confirm(`确定要永久删除短码为 ${escapeHtml(codeHash.substring(0,8))}... 的分享记录吗？此操作不可恢复！`)) {
            return;
        }
        try {
            const data = await fetchAdminApi('/delete_share', 'POST', { codeHash });
            if (data.success) {
                // alert(data.message); 在 fetchAdminApi 中处理
                // 从当前标签页数据中移除，并重新渲染或重新加载第一页
                tabsConfig[activeStatus].currentPage = 1;
                tabsConfig[activeStatus].isEnd = false;
                tabsConfig[activeStatus].data = [];
                loadSharesForTab(activeStatus, 1, false);
            } // else fetchAdminApi 已经 alert
        } catch (error) { /* 错误已由 fetchAdminApi 处理 */ }
    }

    copyModalShareCodeBtn.addEventListener('click', function() {
        copyToClipboard(modalShareCodeTextarea, copyModalShareCodeBtn, '已复制!', originalCopyModalBtnHtml);
    });

    document.querySelectorAll('#adminTabs .nav-link').forEach(tabLink => {
        tabLink.addEventListener('shown.bs.tab', function (event) {
            activeStatus = event.target.id.split('-')[0]; 
            const tabConfig = tabsConfig[activeStatus];
            // 切换标签页时，如果数据为空或未到末尾（意味着可能只是加载了一部分），则重新加载
            // 如果数据已加载完毕 (isEnd is true)，则不重新加载，除非强制刷新
            if (tabConfig.data.length === 0 || !tabConfig.isEnd ) {
                tabConfig.currentPage = 1;
                tabConfig.isEnd = false;
                tabConfig.data = []; // 清空旧数据
                loadSharesForTab(activeStatus, 1, false);
            }
        });
    });

    document.querySelectorAll('.tab-pane .table-responsive').forEach(scrollableDiv => {
        scrollableDiv.addEventListener('scroll', function() {
            const paneId = scrollableDiv.closest('.tab-pane').id;
            const statusOfPane = paneId.split('-')[0]; 
            if (statusOfPane !== activeStatus) {
                return;
            }
            const tabConfig = tabsConfig[activeStatus];
            if (tabConfig.isLoading || tabConfig.isEnd) {
                return;
            }
            const { scrollTop, scrollHeight, clientHeight } = scrollableDiv;
            if (scrollHeight - scrollTop - clientHeight <= 200) { 
                loadSharesForTab(activeStatus, tabConfig.currentPage + 1, true); 
            }
        });
    });

    async function fetchAndDisplayContentTree(params) {
        const payload = {};
        if (params.shareCode) { 
             payload.shareCode = params.shareCode;
        } else if (params.codeHash) {
            payload.codeHash = params.codeHash;
        }

        if (!payload.codeHash && !payload.shareCode) {
            contentTreeDisplayArea.innerHTML = '<p class="text-center text-danger">错误: 查看目录树缺少必要的分享码信息。</p>';
            if (bsContentTreeModal) bsContentTreeModal.show();
            return;
        }

        contentTreeDisplayArea.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">加载中...</span></div> <span class="ms-2 text-muted">正在加载目录结构...</span></div>';
        contentTreeSearchInput.value = ''; 
        if (bsContentTreeModal) bsContentTreeModal.show(); 

        try {
            const response = await fetch(API_GET_CONTENT_TREE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            contentTreeDisplayArea.innerHTML = ''; 

            if (result.isFinish === true) {
                if (Array.isArray(result.message) && result.message.length > 0) {
                    const treeHtml = result.message.map(line => `<div>${escapeHtml(line)}</div>`).join('');
                    contentTreeDisplayArea.innerHTML = treeHtml;
                } else if (Array.isArray(result.message) && result.message.length === 0) {
                     contentTreeDisplayArea.innerHTML = '<p class="text-center text-muted p-3">此分享内容为空。</p>';
                } else { 
                    contentTreeDisplayArea.innerHTML = '<p class="text-center text-muted p-3">目录为空或无法解析。</p>';
                }
            } else { 
                contentTreeDisplayArea.innerHTML = `<p class="text-center text-danger p-3">错误: ${escapeHtml(result.message)}</p>`;
            }
        } catch (error) {
            console.error('获取目录树失败:', error);
            contentTreeDisplayArea.innerHTML = `<p class="text-center text-danger p-3">请求目录树失败: ${escapeHtml(error.message)}</p>`;
            if (bsContentTreeModal && !bsContentTreeModal._isShown) bsContentTreeModal.show();
        }
    }

    if (contentTreeSearchInput) {
        contentTreeSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const lines = contentTreeDisplayArea.querySelectorAll('div'); 
            lines.forEach(lineEl => {
                const text = lineEl.textContent.toLowerCase();
                lineEl.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    if (contentTreeModalEl) {
        contentTreeModalEl.addEventListener('hidden.bs.modal', function () {
            contentTreeSearchInput.value = ''; 
            const lines = contentTreeDisplayArea.querySelectorAll('div');
            lines.forEach(lineEl => {
                lineEl.style.display = ''; 
            });
            contentTreeDisplayArea.innerHTML = ''; 
        });
    }

    // 更新数据库按钮的事件监听器
    if (updateDatabaseBtn) {
        updateDatabaseBtn.addEventListener('click', async function() {
            if (!confirm('确定要从远程服务器更新主数据库吗？此操作可能需要一些时间，期间部分功能可能暂时不可用。')) {
                return;
            }

            const originalButtonHtml = this.innerHTML; // 保存原始按钮内容
            this.disabled = true;
            this.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 更新中...`;

            try {
                // 调用新的管理员API来更新数据库
                // 注意：fetchAdminApi 内部会处理 alert
                const data = await fetchAdminApi('/update_database', 'POST'); 
                
                // API 响应格式为 {"isFinish": bool, "message": "..."}
                // fetchAdminApi 在成功时（response.ok）会直接返回解析后的JSON data
                // 在失败时（!response.ok）或网络错误时，会抛出异常，并由其内部的 catch 处理 alert
                // 因此，这里只需要检查 data.isFinish 即可

                if (data && data.isFinish) { // 确保 data 存在且 isFinish 为 true
                    // 对于成功的操作，fetchAdminApi 通常不会 alert，所以这里可以补一个
                    alert(`数据库更新成功！\n${data.message || ''}`);
                    // 更新成功后，刷新当前标签页的数据
                    loadSharesForTab(activeStatus, 1, false); 
                } else if (data && data.message) { // 如果 isFinish 为 false，但有 message
                    // fetchAdminApi 应该在 !response.ok 时已 alert，但如果逻辑是 response.ok 但 isFinish=false
                    alert(`数据库更新提示: ${data.message}`);
                }
                // 如果 data 为空或 data.isFinish 未定义（理论上不应发生，因为 fetchAdminApi 会处理），
                // 错误已由 fetchAdminApi 的 catch 块处理。

            } catch (error) {
                // fetchAdminApi 内部的 catch 已经处理了 alert
                // console.error("更新数据库按钮点击处理中发生错误:", error); // 错误已在fetchAdminApi中记录和alert
            } finally {
                this.disabled = false;
                this.innerHTML = originalButtonHtml; // 恢复按钮原始状态
            }
        });
    }

    loadSharesForTab(activeStatus, 1, false); 
});