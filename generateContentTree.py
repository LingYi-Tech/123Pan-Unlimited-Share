import json
import base64
 
def _get_icon(file_name: str) -> str:
    """
    根据文件名获取对应的图标。（只针对文件，也就是"Type": 0）
    """
    if not file_name or '.' not in file_name:
        return "📄" # Default for files with no extension or empty name
 
    file_type = file_name.split('.')[-1].lower()
    if file_type in ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'svg', 'webp']:
        return "🖼️"
    elif file_type in ['mp3', 'wav', 'ogg', 'dsd', 'flac', 'aac', 'wma', 'm4a', 'mpc', 'ape', 'wv', 'wvx', 'dff', 'dsf', 'm4p']:
        return "🎵"
    elif file_type in ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', '3gp', 'm4v', 'ogv', 'asf', 'mts', 'm2ts', 'ts']:
        return "🎥"
    elif file_type in ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']:
        return "🗄️"
    else:
        return "📄"
 
def generateContentTree(b64_data_str: str) -> str:
    """
    根据输入的JSON字符串数据，生成string格式的目录树。
 
    Args:
        b64_data_str: 包含文件/文件夹信息的base64格式字符串。
 
    Returns:
        一个表示目录树的字符串。
    """
    try:
        all_items_list = json.loads(base64.urlsafe_b64decode(b64_data_str).decode("utf-8"))
    except Exception as e:
        return {"isFinish": False, "message": f"错误: {e}"}
 
    # 1. 构建节点映射表 (FileId -> item_data) 并初始化子节点列表
    nodes = {}
    for item_dict in all_items_list:
        # 创建副本以避免修改原始列表中的字典
        item = item_dict.copy()
        item['children'] = []  # 为每个节点添加一个子节点列表
        nodes[item['FileId']] = item
 
    # 2. 构建树形结构：将子节点挂载到父节点上
    root_items = []
    all_file_ids_in_data = set(nodes.keys())
 
    for item_id, item_data in nodes.items():
        parent_id = item_data.get('parentFileId')
        # 如果父ID存在且该父ID也在我们当前处理的数据集中，则将其添加为子节点
        if parent_id is not None and parent_id in nodes:
            nodes[parent_id]['children'].append(item_data)
        # 否则，如果父ID不存在于当前数据集中（或parentFileId本身不存在），
        # 那么这个item被认为是当前数据集中的一个根项目
        elif parent_id not in all_file_ids_in_data: # This handles items whose parent is outside the current list
            root_items.append(item_data)
        # Add a fallback for items truly without a parentFileId, though the example data has it
        elif parent_id is None:
             root_items.append(item_data)
 
    # 3. 对每个节点的子节点列表和根项目列表按文件名排序
    for node in nodes.values():
        if node['children']:
            node['children'].sort(key=lambda x: x['FileName'])
    
    root_items.sort(key=lambda x: x['FileName'])
 
    # 4. 递归生成树形字符串
    tree_lines = []
 
    def build_tree_recursive(item, prefix, is_last_child):
        # 获取图标
        if item['Type'] == 1:  # 文件夹
            icon = "📂"
        else:  # 文件
            icon = _get_icon(item['FileName'])
 
        # 连接符
        connector = "└── " if is_last_child else "├── "
        
        tree_lines.append(f"{prefix}{connector}{icon} {item['FileName']}")
 
        # 更新下一级的前缀
        children_prefix = prefix + ("    " if is_last_child else "│   ")
        
        children = item.get('children', [])
        for i, child in enumerate(children):
            build_tree_recursive(child, children_prefix, i == len(children) - 1)
 
    # 5. 从根节点开始生成
    for i, root_item in enumerate(root_items):
        # 对于根项目，它们没有父级的前缀结构，所以直接开始
        # 如果只有一个根项目，可以用 "└── "，多个则按常规处理
        # For simplicity, let's treat multiple roots as siblings under an implicit main root
        # Or, if we want to display them flatly at the top:
        icon = "📂" if root_item['Type'] == 1 else _get_icon(root_item['FileName'])
        tree_lines.append(f"{icon} {root_item['FileName']}") # Top-level items don't use connectors
        
        children_prefix = "" # Initial prefix for children of root items
        
        # Update: For a more standard tree look even for multiple roots
        # We can define a helper to start recursion slightly differently for roots
        # Let's stick to calling the recursive helper which adds the connector logic
        # build_tree_recursive(root_item, "", i == len(root_items) - 1)
        # This would treat roots as children of an invisible "".
        # The above `tree_lines.append(f"{icon} {root_item['FileName']}")` followed by recursive calls
        # for children is more common for multiple "root" shares.
        #
        # Let's refine this: if root_items are truly roots to display, they shouldn't have prefixes like ├──
        # The recursive function should be called for their children.
        
        # Corrected approach for root items:
        # They are printed directly, then their children are processed with initial prefixes.
 
        children = root_item.get('children', [])
        for idx, child_of_root in enumerate(children):
            # Each child of a "root" item will get a fresh prefix start
            initial_child_prefix = "" # This is the prefix for the connector itself
                                     # The connector will be ├── or └──
            build_tree_recursive(child_of_root, initial_child_prefix, idx == len(children) - 1)
 
    # Let's refine the root item handling for proper tree structure from the very top.
    # The previous logic for root items display was a bit off.
    # We should iterate root_items and call build_tree_recursive for them directly.
    
    tree_lines = [] # Resetting for the refined root handling
 
    def generate_lines_for_list(item_list, base_prefix):
        num_items = len(item_list)
        for i, item in enumerate(item_list):
            is_last = (i == num_items - 1)
            icon = "📂" if item['Type'] == 1 else _get_icon(item['FileName'])
            connector = "└── " if is_last else "├── "
            tree_lines.append(f"{base_prefix}{connector}{icon} {item['FileName']}")
            
            children_prefix = base_prefix + ("    " if is_last else "│   ")
            # Recursively process children if they exist and are sorted
            if item['children']:
                generate_lines_for_list(item['children'], children_prefix)
 
    # Start generation from the sorted root_items
    num_root_items = len(root_items)
    for i, root_item_data in enumerate(root_items):
        is_last_root = (i == num_root_items - 1)
        icon = "📂" if root_item_data['Type'] == 1 else _get_icon(root_item_data['FileName'])
        
        # For root items, we don't typically use the '├──' or '└──' unless they are under a single "share name".
        # If we want them to appear as the topmost entries:
        tree_lines.append(f"{icon} {root_item_data['FileName']}")
        
        # Then list their children with appropriate prefixes
        if root_item_data['children']:
            generate_lines_for_list(root_item_data['children'], "") # Start children with no base_prefix, connector add prefix
                                                                    # This will result in ├── or └── for direct children
                                                                    # of the root item.
    
    return {"isFinish": True, "message": tree_lines}

if __name__ == "__main__":
    
    with open("./export/#居酒屋新干线 (2021) {tmdb-153447}.123share", "r", encoding="utf-8") as file:
        data = file.read()

    data = generateContentTree(data)
    
    with open("TREE.md", "w", encoding="utf-8") as file:
        # file.write("\n".join(data.get("message")))
        file.write(str(data.get("message")))