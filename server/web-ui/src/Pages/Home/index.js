import React from 'react';
import { Redirect } from 'react-router-dom';
import useAsyncMethod, { getUsers } from '../api';
import { P, H1 } from '../../Common/Header';
import Table from '../../Common/Table/themes/strips';
import Nav from '../Nav';
import { generateAvatarById } from '../../Services/avatar';
import Toggle from '../../Common/Toggle';
import {Body, Content, RowStyle ,Buttons, Avatar, SvgButton, SvgBase, avatarSize} from './styled';

const deleteIcon = `
<svg
 xmlns="http://www.w3.org/2000/svg"
 xmlns:xlink="http://www.w3.org/1999/xlink"
 width="15px" height="17px">
<path fill-rule="evenodd" stroke-width="2px" stroke-linecap="butt" stroke-linejoin="miter" fill="none"
 d="M4.000,3.999 L9.999,3.999 C11.104,3.999 11.999,4.895 11.999,5.999 L10.999,12.999 C10.999,14.104 10.104,15.000 8.999,15.000 L4.999,15.000 C3.895,15.000 2.999,14.104 2.999,12.999 L1.999,5.999 C1.999,4.895 2.895,3.999 4.000,3.999 Z"/>
<path fill-rule="evenodd" stroke-width="2px" stroke-linecap="butt" stroke-linejoin="miter" fill="none"
 d="M4.000,3.999 L4.000,2.000 C4.000,1.447 4.446,0.999 4.999,0.999 L8.999,0.999 C9.551,0.999 9.999,1.447 9.999,2.000 L9.999,3.999 "/>
<path fill-rule="evenodd" stroke-width="2px" stroke-linecap="butt" stroke-linejoin="miter" fill="none"
 d="M0.998,3.999 L12.999,3.999 L12.999,5.999 L0.998,5.999 L0.998,3.999 Z"/>
</svg>`;

const editIcon = `
<svg
 xmlns="http://www.w3.org/2000/svg"
 xmlns:xlink="http://www.w3.org/1999/xlink"
 width="14px" height="14px">
<path fill-rule="evenodd"  fill="rgb(111, 111, 111)"
 d="M12.579,2.833 L11.162,1.417 L12.579,0.000 L13.995,1.417 L12.579,2.833 ZM4.541,10.871 L3.123,9.455 L10.454,2.125 L11.870,3.541 L4.541,10.871 ZM-0.002,13.997 L0.352,12.227 L1.414,11.165 L2.830,12.581 L1.768,13.643 L-0.002,13.997 Z"/>
</svg>`;

const customAvatarSeed = 'Auto Fleet';

const columns = [
  {
    Header: '',
    width: 60,
    id: 'avatar',
    Cell: ({ original: user }) => {
      console.log(user);

      if (user.avatar) {
        return <Avatar src={user.avatar}/>;
      } else {
        return <SvgBase svg={generateAvatarById(`${user.firstName} ${user.lastName}` || customAvatarSeed)}
                    width={avatarSize} height={avatarSize}/>;
      }
    }
  },
  { accessor: 'firstName', Header: 'First name' },
  { accessor: 'lastName', Header: 'Last name' },
  { accessor: 'email', Header: 'Email' },
  { accessor: 'active', Header: 'Active' },
  { accessor: 'phoneNumber', Header: 'Phone number' },
  {
    Header: '',
    id: 'buttons',
    minWidth: 90,
    accessor: ({ id, active }) => ({ id, active }),
    Cell: ({ value: { id, active } }) => ( // eslint-disable-line react/prop-types
      <Buttons>
        <SvgButton svg={editIcon} />
        <SvgButton svg={deleteIcon} />
      </Buttons>
    )
  },
  {
    Header: '',
    id: 'toggle',
    minWidth: 50,
    accessor: ({ id, active }) => ({ id, active }),
    Cell: ({ value: { id, active } }) => ( // eslint-disable-line react/prop-types
      <section>
      <Toggle
            value={`toggle_${id}`}
            checked={active === true}
            onChange={(event) => {


              if (event.target.checked) {
                console.log('active');

              } else {
                console.log('not active');
              }
      }}
          /></section>
    )
  }
];

const defaultTrProps = () => ({ className: RowStyle });
const innerTrProps = defaultTrProps;

export default () => {
  if (!localStorage.token) {
    return <Redirect to="/login"/>;
  } else {
    const tracesCall = useAsyncMethod(getUsers, null, []);
    return <Body>
      <Nav/>
      <Content>
        <H1>
          Users
        </H1>
        <P>{!tracesCall.data.length ? 'Loading...' : null}</P>
        <Table
          getTrProps={innerTrProps}
          columns={columns}
          data={tracesCall.data}
        />
      </Content>
    </Body>;
  }
};