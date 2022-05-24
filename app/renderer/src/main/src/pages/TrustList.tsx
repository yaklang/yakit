import React, { memo, ReactNode, useEffect, useRef, useState } from "react";
import { Button, Input, List, Tag } from "antd";
import { GithubOutlined, QqOutlined, WechatOutlined, SearchOutlined } from "@ant-design/icons";
import { ItemSelects } from "@/components/baseTemplate/FormItemUtil";
import type { SelectProps } from 'antd/es/select';
import debounce from 'lodash/debounce'
import "./TrustList.scss";
import { info } from "@/utils/notification";
import { useMemoizedFn } from "ahooks";

const { Search } = Input;
const { ipcRenderer, contextBridge } = window.require("electron")

const PlatformIcon: { [key: string]: ReactNode } = {
  github: <GithubOutlined />,
  wechat: <WechatOutlined />,
  qq: <QqOutlined />
}
export interface TrustListProp {
  appid: string
  created_at: number | null
  from_platform: string
  head_img: string | undefined
  wechatHeadImg: string | null
  id: number | null
  name: string | undefined
  tags: string[] | null
  updated_at: number | null
}

export interface ListReturnType {
  data: TrustListProp[]
  pagemeta: null | {
    limit: number | null
    page: number | null
    total: number | undefined
    total_page: number | null
  }
}

export interface DebounceSelectProps<ValueType = any>
  extends Omit<SelectProps<ValueType>, 'options' | 'children'> {
  fetchOptions: (search: string) => Promise<ValueType[]>;
  debounceTimeout?: number;
}


export const TrustList: React.FC = memo(() => {
  const [userList, setUserList] = useState<TrustListProp[]>([]);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [trustUserData, setTrustUserData] = useState<ListReturnType>({ data: [], pagemeta: null });
  const [loading, setLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [appid, setAppid] = useState<string>('');
  const getUserList = debounce(
    useMemoizedFn((str: string) => {
      ipcRenderer
        .invoke("fetch-user-list", { keywords: str })
        .then((res) => {
          const user = res?.from && JSON.parse(res.from) || {};
          setUserList(user.data || [])
        })
        .catch((err) => { })
    }), 500
  );
  const getTrustUserList = useMemoizedFn((value: string = 'all', page: number = 1, pageSize: number = 12) => {
    const param = {
      page,
      limit: pageSize,
      keywords: value
    }

    ipcRenderer
      .invoke("fetch-trust-user-list", param)
      .then((res) => {
        const trustUser = res?.from && JSON.parse(res.from) || { data: [], pagemeta: null };
        setTrustUserData(trustUser)
      })
      .catch((err) => { })
      .finally(() => setTimeout(() => setLoading(false), 300))
  })

  useEffect(() => {
    getTrustUserList()
  }, []);

  const onSelectUser = useMemoizedFn((option: any) => {
    setAppid(option.title);
    setCurrentUser(option.value);
  })

  const onAddOrRemove = useMemoizedFn((appid: string, operation: string, isSetLoading: boolean) => {
    if (!appid) {
      info('请先选择用户');
      return;
    }
    const param = {
      appid,
      operation
    };
    if (isSetLoading) setLoading(true);
    ipcRenderer
      .invoke("add-or-remove-user", param)
      .then((res) => {
        setAppid('');
        setCurrentUser('');
        getTrustUserList();
        setUserList([]);
      })
      .catch((err) => { })
      .finally(() => {
        setTimeout(() => {
          setLoading(false);
          setRemoveLoading(false);
        }, 300)
      })
  })

  const onRemove = useMemoizedFn((appid: string) => {
    setAppid(appid);
    setRemoveLoading(true)
    onAddOrRemove(appid, "remove", false);
  })

  return (
    <div className='trust-list-container'>
      <div className='add-account-body'>
        <span>添加用户:</span>
        <ItemSelects
          isItem={false}
          select={{
            showSearch: true,
            style: { width: 360 },
            className: "add-select",
            allowClear: true,
            data: userList,
            optValue: "name",
            optText: 'appid',
            placeholder: "请输入完整的用户名",
            optionLabelProp: "name",
            value: currentUser,
            onSelect: (_, option: any) => onSelectUser(option),
            onSearch: getUserList,
            renderOpt: (info: TrustListProp) => {
              return (
                <div className='select-opt'>
                  <img src={info.head_img} className='opt-img' />
                  <div className='opt-author'>
                    <div className='author-name content-ellipsis'>{info.name}</div>
                    <div className='author-platform'>
                      {PlatformIcon[info.from_platform]}
                    </div>
                  </div>
                </div>
              )
            }
          }}
        ></ItemSelects>
        <Button
          className='add-btn'
          type='primary'
          loading={loading}
          onClick={() => onAddOrRemove(appid, 'add', true)}
        >
          添加
        </Button>
      </div>

      <div className='added-account-body'>
        <div className='added-header'>
          <span className='header-title'>信任用户列表</span>
        </div>
        <Search
          placeholder="请输入用户名进行搜索"
          onSearch={(val: string) => getTrustUserList(val||'all')}
          style={{ width: 480 }}
          allowClear
          onChange={(e) => { if (!e.target.value) getTrustUserList('all') }}
        />
        <div className='added-list'>
          <List<TrustListProp>
            grid={{ gutter: 12, column: 4 }}
            dataSource={trustUserData.data || []}
            pagination={{
              size: "small",
              defaultCurrent: 1,
              pageSize: 12,
              showSizeChanger: false,
              total: trustUserData?.pagemeta?.total || 0,
              // hideOnSinglePage: true,
              showTotal: (total, rang) => <Tag>{`Total ${total}`}</Tag>,
              onChange: (page, pageSize) => getTrustUserList('all', page, pageSize)
            }}
            loading={loading}
            renderItem={(item: TrustListProp, index: number) => {
              return (
                <List.Item key={item.id}>
                  <div className='list-opt'>
                    <div>
                      <img
                        src={item.head_img}
                        className='opt-img'
                      />
                    </div>
                    <div className='opt-author'>
                      <div className='author-name content-ellipsis' title={item.name}>
                        {item.name}
                      </div>
                      <div className='author-icon'>
                        {PlatformIcon[item.from_platform]}
                      </div>
                    </div>
                    <div>
                      <Button loading={removeLoading && appid === item.appid} className='opt-remove' type='link' danger onClick={() => onRemove(item.appid)}>
                        移除
                      </Button>
                    </div>
                  </div>
                </List.Item>
              )
            }}
          ></List>
        </div>
      </div>
    </div>
  )
})
