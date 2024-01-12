// SearchLoader.tsx
import React from 'react'
import BlockUi from '@availity/block-ui'

import { DNA } from 'react-loader-spinner'

interface SearchLoaderProps {
  loading: boolean
  children: React.ReactNode
}

const loader = (
  <DNA
    visible={true}
    height="80"
    width="80"
    ariaLabel="dna-loading"
    wrapperStyle={{}}
    wrapperClass="dna-wrapper"
  />
)

const BlockUiLoader: React.FC<SearchLoaderProps> = ({ loading, children }) => (
  <BlockUi
    tag="div"
    style={{ height: '100%', width: '100%' }}
    loader={loader}
    blocking={loading}
    message="Loading, please wait"
    keepInView
  >
    {children}
  </BlockUi>
)

export default BlockUiLoader
